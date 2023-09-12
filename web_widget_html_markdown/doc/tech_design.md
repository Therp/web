# Technical design of the markdown for html fields widget

When this widget is linked to an html field, the user will be able to switch between an
html editor and a markdown editor for the fields content. The display of the field, and
the contents stored will always be html.

Actually when editing in markdown, this markdown will also be stored in html, but then
as a hidden code section. In this way using the widget does not need any new database
element.

To convert from markdown to html, the marked library is used: [marked]:
https://github.com/markedjs/marked

To convert from html to markdown the turndown library is used: [turndown]:
https://github.com/mixmark-io/turndown

## Events

1. Starting the editor

When a field is going to be edited, we have to show either the html editor or the
markdown editor. For existing records, we just look at the presence or absence of stored
markdown code. For new records we will look at the field options.

2. Switching to markdown

- Take the html value and convert it to markdown;
- Create the markdown hidden paragraph, and add it to the html;
- Activate the markdown editor;
- Change to info in the control area to show markdown is being used.

3. Switching to html

- Take the markdown content and convert it to html;
- Remove the hidden markdown paragraph;
- Activate the html editor;
- Change to info in the control area to show html is being used.

4. Saving the form: commiting the changes

If html is being used, nothing special needs to be done.

If markdown is being used:

- Convert the markdown value to html;
- Add the hidden paragraph with the markdown content;
- Replace the html contents with the html genererated, including the hidden paragraph.
