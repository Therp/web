Behaviour of the module and best practices
==========================================

This module implements a markdown editor on html fields, in contrast to
web_widget_text_markdown, which implements it on text fields. In readonly mode,
the widget displays html, but when editing, the widget offers you an option to edit
in markdown or in html. If you edit markdown, it will save as the rendered html,
but with the source markdown embedded inside a <script> tag. When editing again,
it will show you the markdown source. If you edit html, you will lose the markdown
and the content will just behave as a regular html field with an html widget.

Limitations
===========

The module does allow switching from html to markdown editing. However the conversion
from html to markdown will most likely lose some information. That is why users
are warned before making this switch.
