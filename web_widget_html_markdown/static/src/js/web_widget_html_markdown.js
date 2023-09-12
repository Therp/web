/* global marked, TurndownService */
/* Copyright 2022-2023 Therp B.V. - <https:///therp.nl>
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
odoo.define("web_widget_html_markdown.FieldHtmlMarkDown", function (require) {
    "use strict";
    var field_html = require("web_editor.field.html");
    var config = require("web.config");
    var core = require("web.core");
    var Wysiwyg = require("web_editor.wysiwyg.root");
    var field_registry = require("web.field_registry");
    require("web._field_registry");
    var QWeb = core.qweb;
    var _t = core._t;
    var _lt = core._lt;
    var STATIC_PATH = "/web_widget_html_markdown/static/src";
    var LIBS_PATH = STATIC_PATH + "/lib/";
    var CUST_CSS_PATH = STATIC_PATH + "/css/";

    var FieldHtmlMarkDown = field_html.extend({
        description: _lt("HtmlMarkdown"),
        classname: "oe_form_field oe_form_field_html_markdown",
        supportedFieldTypes: ["html"],
        jsLibs: [
            LIBS_PATH + "turndown.js",
            LIBS_PATH + "marked.js",
            LIBS_PATH + "dropzone.js",
            LIBS_PATH + "bootstrap-markdown.js",
        ],
        cssLibs: [
            LIBS_PATH + "bootstrap-markdown.min.css",
            CUST_CSS_PATH + "web_widget_html_markdown.css",
        ],
        xmlDependencies: [STATIC_PATH + "/xml/radio_info.xml"],
        /* =========================INIT AND START===============*/
        init: function (parent, options) {
            this._super.apply(this, arguments);
            var is_new = !this.res_id;
            /* TODO: add options to forbid switch to html or switch to markdown
                     on existing records.
            */
            this.options = _.extend(
                {
                    default_markdown_on_new:
                        (this.attrs.options.default_markdown_on_new && is_new) || 0,
                    only_markdown_on_new:
                        (this.attrs.options.only_markdown_on_new && is_new) || 0,
                },
                options || {}
            );
        },
        start: function () {
            this._super();
            this.markdownEditor = false;
            if (
                this.options.default_markdown_on_new ||
                this.options.only_markdown_on_new
            ) {
                this._createMarkdownEditorInstance();
            }
            var md_s = QWeb.render("web_widget_html_markdown.radio_info", {
                widget: this,
            });
            this.$el.prepend(md_s);
            var self = this;
            this.$el.find("input#markdown").change([self], self._switch_to_markdown);
            this.$el.find("input#html").change([self], self._switch_to_html);
            this.infoarea = this.$el.find("div#md_infoarea");
            this.input_markdown = this.$el.find("input#markdown");
            this.input_html = this.$el.find("input#html");
            this.markdown_label = this.$el.find("label#markdown_label");
            this.html_label = this.$el.find("label#html_label");
        },
        /* =========================HTML WIDGET OVERIDES AND EXTENSIONS===============*/
        commitChanges: function () {
            if (this.mode === "edit" && this._is_markdown()) {
                var markdown_content = "";
                if (this.markdownEditor) {
                    markdown_content = this.markdownEditor[0].value;
                }
                // Transform in html before saving
                this.save_markdown(markdown_content);
                return this._setValue(this.value, {forceChange: true});
            }
            /*
            We need this override because we need to change in core
            setValue to forceChange:true, or it won't pick up changes
            if they where done in the markdown editor instead of the html
            editor.
            */
            var self = this;
            if (config.isDebug() && this.mode === "edit") {
                // Summernote is the standard editor in Odoo for html fields.
                var layoutInfo = $.summernote.core.dom.makeLayoutInfo(
                    this.wysiwyg.$editor
                );
                $.summernote.pluginEvents.codeview(
                    undefined,
                    undefined,
                    layoutInfo,
                    false
                );
            }
            if (this.mode === "edit") {
                var _super = this._super.bind(this);
                this._setValue(this.value, {forceChange: true});
                return this.wysiwyg.saveModifiedImages(this.$content).then(function () {
                    return self.wysiwyg.save(self.nodeOptions).then(function () {
                        self._isDirty = true;
                        _super();
                    });
                });
            }
        },
        reset: function (record, event) {
            // Similar to HTML widget version, but overridden with forceChange:True
            var value = this.value;
            this._reset(record, event);
            if (this.nodeOptions.wrapper) {
                value = this._wrap(value);
            }
            value = this._textToHtml(value);
            if (!event || event.target !== this) {
                if (this.mode === "edit") {
                    this.wysiwyg._setValue(value, {forceChange: true});
                } else {
                    this.$content.html(value);
                }
            }
            return Promise.resolve();
        },
        _getValue: function () {
            var value = "";
            if (this._is_markdown()) {
                var markdown_content = this.markdownEditor[0].value;
                value = this._convertMarkdownToHtml(markdown_content);
            } else {
                value = this.$target.val();
            }
            if (this.nodeOptions.wrapper) {
                return this._unWrap(value);
            }
            return value;
        },
        _createWysiwygIntance: function () {
            /*
             * In core this is named _createWysiwygIntance (without the s),
             * clearly a typo. It is used in _renderEdit.
             * Replicating the incorrect naming here too so all works.
             */
            var self = this;
            this.wysiwyg = new Wysiwyg(this, this._getWysiwygOptions());
            this.wysiwyg.__extraAssetsForIframe = this.__extraAssetsForIframe || [];
            // By default this is synchronous, the assets are  loaded in willStart
            // but it can be async in the case of options such as iframe, snippets...
            return this.wysiwyg.attachTo(this.$target).then(function () {
                self.$content = self.wysiwyg.$editor.closest(
                    "body, odoo-wysiwyg-container"
                );
                self.isRendered = false;
                self._onLoadWysiwyg();
                self._load_start_editor();
            });
        },
        _load_start_editor: function () {
            /* If this is not new, we choose between html editing and markdown
               editing based on the presence or absense of stored markdown code.
               For new records we look at the options for this field.
            */
            var start_markdown = false;
            if (this.res_id) {
                // Existing record
                if (this._is_markdown()) {
                    start_markdown = true;
                }
            } else if (
                this.options.only_markdown_on_new ||
                this.options.default_markdown_on_new
            ) {
                start_markdown = true;
            }
            if (start_markdown) {
                this.load_markdown_editor();
            } else {
                this.load_html_editor();
            }
        },
        _renderReadonly: function () {
            this._super.apply(this, arguments);
            var label = "HTML";
            if (this._is_markdown()) {
                label = "Markdown";
            }
            this.$el.prepend(
                '<div class="badge badge-primary float-right">' + label + "</div>"
            );
            // Parent returns nothing.
        },
        /* =========================TAG MANAGEMENT===========================*/
        _generate_markdown_tag: function (md_content) {
            // Forced to do this with hidden p tag, because both
            // attribute html_checksum and also data-html_checksum (html5 compliant)
            // are wiped out.
            var tag =
                '<p style="display:none;" class="web_widget_html_markdown_source"' +
                ' type="text/plain">' +
                md_content +
                "</p>";
            return tag;
        },
        _get_markdown_tag: function () {
            var tags = this.$content.find(".web_widget_html_markdown_source");
            if (tags.length) {
                return tags[0];
            }
            return false;
        },
        _is_markdown: function () {
            var tag = this._get_markdown_tag();
            if (tag) {
                return true;
            }
            return false;
        },
        /* =========================SWITCHERS AND VALUE FETCHERS=================*/
        switchable_to_markdown: function () {
            /* For the moment just return true. */
            return true;
        },
        save_markdown: function (markdown_content) {
            var html_content = this._convertMarkdownToHtml(markdown_content);
            var tag = this._generate_markdown_tag(markdown_content);
            this.value = '<div class="html_container">' + html_content + "</div>" + tag;
            this.wysiwyg.setValue(this.value);
        },
        load_markdown_editor: function () {
            /**
                Load markdown from tag, or create the tag.
                Then initialize the markdown editor.
            */
            var markdown_content = "";
            var tag = this._get_markdown_tag();
            if (tag) {
                markdown_content = this._getMarkdownValue();
            } else {
                this.save_markdown(markdown_content);
            }
            this._createMarkdownEditorInstance();
            this.markdownEditor.val(markdown_content);
            $(this.wysiwyg.el).parent().hide();
            this.markdownEditor.parent().show();
            this.input_markdown.prop("checked", true);
            if (this.input_html) {
                this.input_html.prop("checked", false);
            }
        },
        _switch_to_markdown: function (ev) {
            var self = ev.data[0];
            var turndownService = new TurndownService();
            var markdown_content = turndownService.turndown(self._getValue());
            self.save_markdown(markdown_content);
            self.load_markdown_editor();
        },
        _getMarkdownValue: function () {
            var tag = this._get_markdown_tag();
            if (tag) {
                return tag.innerText;
            }
            return "";
        },
        _convertMarkdownToHtml: function (markdown_content) {
            var content = markdown_content || "";
            return marked(this._formatValue(content));
        },
        load_html_editor: function () {
            this.wysiwyg.setValue(this.value);
            $(this.wysiwyg.el).parent().show();
            this.input_markdown.prop("checked", false);
            if (this.input_html) {
                this.input_html.prop("checked", true);
            }
        },
        _switch_to_html: function (ev) {
            /**
                If we switch from markdown to html, we will discard the hidden
                markdown paragraph from the html content. In this way, when
                we edit again, we know the user wants to edit in html.
            */
            var self = ev.data[0];
            if (self.markdownEditor) {
                var markdown_content = self.markdownEditor[0].value;
                self.value = self._convertMarkdownToHtml(markdown_content);
                self.markdownEditor.parent().hide();
            }
            self.load_html_editor();
        },
        /* =========================MARKDOWN EDITOR ===============*/
        _getMarkdownOptions: function () {
            var self = this;
            var markdownOpts = {
                iconlibrary: "fa",
                width: "o_field_html_markdown",
                autofocus: false,
                savable: false,
                language: this.getSession().user_context.lang,
                onPreview: function (e) {
                    // This will use marked
                    var render_val = self._convertMarkdownToHtml(e.getContent());
                    return render_val;
                },
            };
            // Only can create attachments on non-virtual records
            if (this.res_id) {
                markdownOpts.dropZoneOptions = {
                    paramName: "ufile",
                    url: "/web/binary/upload_attachment",
                    acceptedFiles: "image/*",
                    width: "o_field_text_markdown",
                    params: {
                        csrf_token: core.csrf_token,
                        session_id: this.getSession().override_session,
                        callback: "",
                        model: this.model,
                        id: this.res_id,
                    },
                    success: function () {
                        self._markdownDropZoneUploadSuccess(this);
                    },
                    error: function () {
                        self._markdownDropZoneUploadError(this);
                    },
                    init: function () {
                        self._markdownDropZoneInit(this);
                    },
                };
            }
            return markdownOpts;
        },
        _markdownDropZoneInit: function (markdown) {
            var self = this;
            var caretPos = 0;
            var $textarea = null;
            markdown.on("drop", function (e) {
                $textarea = $(e.target);
                caretPos = $textarea.prop("selectionStart");
            });
            markdown.on("success", function (file, response) {
                var text = $textarea.val();
                var attachment_id = self._getAttachmentId(response);
                if (attachment_id) {
                    var ftext =
                        text.substring(0, caretPos) +
                        "\n![" +
                        _t("description") +
                        "](/web/image/" +
                        attachment_id +
                        ")\n" +
                        text.substring(caretPos);
                    $textarea.val(ftext);
                } else {
                    self.do_warn(_t("Error"), _t("Can't create the attachment."));
                }
            });
            markdown.on("error", function (file, error) {
                console.warn(error);
            });
        },
        _markdownDropZoneUploadSuccess: function () {
            this.isDirty = true;
            this._doDebouncedAction();
            this.$markdown.$editor.find(".dz-error-mark:last").css("display", "none");
        },
        _markdownDropZoneUploadError: function () {
            this.$markdown.$editor.find(".dz-success-mark:last").css("display", "none");
        },
        _createMarkdownEditorInstance: function () {
            if (!this.markdownEditor) {
                var markdownEditor =
                    "<textarea  id='comment-md' rows='12' cols='100'></textarea>";
                $(this.$el[0]).append(markdownEditor);
                this.markdownEditor = $(this.$el[0]).find("#comment-md");
                this.markdownEditor.markdown(this._getMarkdownOptions());
            }
        },
    });

    field_registry.add("html_markdown", FieldHtmlMarkDown);
    return FieldHtmlMarkDown;
});
