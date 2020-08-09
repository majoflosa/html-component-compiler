# html-component-compiler

An experimental tool that allows separate html component or partial templates to be injected into a main html template file at build time using NodeJS `fs` module. Useful for developing static html sites.

## Usage

In the root, create a `components` folder and a `templates` folder. (If downloading everything from this repo, replace these folders with your own). 
    - `templates` will hold html files with main page templates (e.g. 'index.html', 'about.html', etc.),
    - `components` will hold sub-folders named after each component/partial to inject.
    - In each sub-folder, create the template for each component/partial with its respective name.

In the main template file (e.g. index.html), add `<comp-[name]></comp-[name]>` where you want the component to be injected, where `name` matches the sub-folder in `components` and the component template file.

Ex: `<comp-nav></comp-nav>` will inject the file in `./components/nav/nav.html`

### Attributes
Component tags can take attributes that will be injected to the root element in the component template.

Ex: `<comp-nav class="nav nav--dark"></comp-nav>`

If an attribute on the parent template collides with one on the partial template, the attribute on the parent will override the partial template, with the exception of `class`, in which case the output component will contain the merged list of classes.

### Output file

Run `node index.js` to output an html file in the project root.

In progress: multiple file templates and output files
