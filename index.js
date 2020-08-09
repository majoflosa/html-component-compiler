const fs = require('fs');

let indexFile = '';
fs.readFile('./templates/index.html', { encoding: 'utf-8' }, (err, data) => {
    if (err) throw err;
    
    // save file content as string in global variable
    indexFile = data;

    // search for <comp-*></comp-*> elements in file
    const scriptRE = /<comp-\b[^>]*>([\s\S]*?)<\/comp-[a-z]*>/gm;
    
    // will contain result of RegExp.exec()
    let match;

    // will contain info about each component to load:
    // name, attributes, original tag, template, and load status
    const components = [];

    // loop for every component being injected in index template
    while(match = scriptRE.exec(indexFile)) {
        // split all parts of element tag
        const parts = match[0].split(' ');
        
        // extract string with all attributes; everything between '<comp-*' and '>'
        let allAttrs = match[0].replace(/<comp-[a-z]*\b/, '').replace(/><\/comp-[a-z]*>/, '').trim();
        
        // separate allAttrs into array of attributes, as 'name="value"'
        const attributesStr = allAttrs.split(/(?<=")\s/);
        
        // create array with attributes as { name, value }
        const attributes = !allAttrs ? [] : attributesStr.map(attr => {
            const attrParts = attr.split('=');
            const name = attrParts[0];
            let value = attrParts[1];
            
            // remove quotes from value
            if (value[0] === "'" || value[0] === '"') {
                value = value.substring(1, value.length - 1);
            }

            return { name, value };
        });

        // extract component name from original component tag
        let compName;
        if (attributes.length) {
            compName = parts[0].replace('<comp-', '');
        } else {
            const a = parts[0].replace('<comp-', '');
            const splitPoint = a.indexOf('>');
            compName = a.substr(0, splitPoint);
        }
        
        // add to component info to list
        components.push({ 
            name: compName,
            attributes: attributes,
            scriptTag: match[0],
            template: null,
            loaded: false,
        });
    }

    // main process for each component
    components.forEach(comp => {
        fs.readFile(`./components/${comp.name}/${comp.name}.html`, { encoding: 'utf-8' }, (err, template) => {
            if (err) throw err;
            
            // update loaded status and template
            comp.loaded = true;
            comp.template = template;

            /**
             * Inject attributes placed in original component tag into component template
             */
            // search for root element tag in template
            const openingTagRE = /<*[^>]*>/;
            const match = openingTagRE.exec(comp.template);

            // match[0] is full tag;
            // openingTag is tag name of top element
            const openingTag = match[0].substr(1).split(/(\s|>)/)[0];

            // extract all attributes in template as string
            const allAttrs = match[0].replace(`<${openingTag}`, '').replace('>', '').trim();
            
            // will contain template attributes as { name, value }
            let templateAttributes = [];

            // check if there are any attributes in template
            if (allAttrs) {
                // array of attributes in template as 'name="value"'
                const attributesStr = allAttrs.split(/(?<=")\s/);
                
                // create array with attributes as { name, value }
                templateAttributes = attributesStr.map(attr => {
                    const attrParts = attr.split('=');
                    const name = attrParts[0];
                    let value = attrParts[1];
                    
                    // remove quotes from value
                    if (value[0] === "'" || value[0] === '"') {
                        value = value.substring(1, value.length - 1);
                    }
        
                    return { name, value };
                });
            }

            // will contain final list of attributes to output, as { name, value }
            let mergedAttrsArr = [];
            
            // handle collisions between attributes in component tag and attributes in template
            // classes should be merged; otherwise, component attributes override template attributes
            comp.attributes.forEach(compAttr => {
                // check if comp attr exists in template
                const match = templateAttributes.find(tplAttr => tplAttr.name === compAttr.name);
                
                if (match) {
                    // if attribute collision is 'class', merge
                    if (compAttr.name === 'class') {
                        const compClassesArr = compAttr.value.split(' ');
                        const tplClassesArr = match.value.split(' ');
                        tplClassesArr.forEach(tplClass => {
                            if (!compClassesArr.includes(tplClass) && tplClass !== comp.name)
                                compClassesArr.push(tplClass);
                        });
                        const mergedClasses = compClassesArr.join(' ');
                        mergedAttrsArr.push({ name: 'class', value: `${comp.name} ${mergedClasses}` });
                    } else {
                        // otherwise, just push component attribute
                        mergedAttrsArr.push(compAttr);
                    }
                } else {
                    // if no collision, push component attribute
                    mergedAttrsArr.push(compAttr);
                }
            });

            // push any template attribute that is not already in component attributes
            templateAttributes.forEach(tplAttr => {
                const match = mergedAttrsArr.find(attr => attr.name === tplAttr.name);
                if (!match) {
                    mergedAttrsArr.push(tplAttr);
                }
            });
            
            // concatenate all attributes into string
            let mergedAttrsStr = '';
            mergedAttrsArr.forEach((attr, i) => {
                mergedAttrsStr += i === 0 ? `${attr.name}="${attr.value}"` : ` ${attr.name}="${attr.value}"`;
            });

            // create new opening tag with all atributes
            const openingTagWithAttrs = mergedAttrsArr.length
                ? `<${openingTag} ${mergedAttrsStr}>`
                : `<${openingTag}>`;

            // replace original template root tag with new one
            comp.template = comp.template.replace(match[0], openingTagWithAttrs);

            // check if any component has yet to load
            const allLoaded = !(components.find(component => component.loaded === false));
            if (allLoaded) {
                // if all loaded, replace all component tags with template
                components.forEach(component => {
                    indexFile = indexFile.replace(component.scriptTag, component.template);
                });

                // output the compiled index file
                fs.writeFile('./index.html', indexFile, { encoding: 'utf-8' }, (err) => {
                    if (err) throw err;
                });
            }
        }); // end reading component file
    }); // end main process for each component
}); // end reading initial index file
