odoo.define('web_export_view.export_xls', function(require) {
    var core = require('web.core');
    var QWeb = core.qweb;
    var _t = core._t;
    var ListView = require('web.ListView');
    var formats = require('web.formats');

    ListView.include({
        render_sidebar: function (arguments) {
            var self = this;
            this._super.apply(this, arguments);
            if (this.options.sidebar) {
                this.sidebar.add_items('other', _.compact([
                { label: '导出Excel', callback: this.on_sidebar_export_view_xls }]));
            }
        },

        on_sidebar_export_view_xls: function () {
            // Select the first list of the current (form) view
            // or assume the main view is a list view and use that
            var self = this;
            view = self.fields_view;
            children=view.children;
            if (children) {
                children.every(function (child) {
                    if (child.field && child.field.type == 'one2many') {
                        view = child.viewmanager.views.list.controller;
                        return false; // break out of the loop
                    }
                    if (child.field && child.field.type == 'many2many') {
                        view = child.list_view;
                        return false; // break out of the loop
                    }
                    return true;
                });
            }
            export_columns_keys = [];
            export_columns_names = [];
            $.each(self.visible_columns, function () {
                if (this.tag == 'field') {
                    // non-fields like `_group` or buttons
                    export_columns_keys.push(this.id);
                    export_columns_names.push(this.string);
                }
            });
            rows = self.$el.find('.o_list_view>tbody>tr');
            export_rows = [];
            $.each(rows, function () {
                $row = $(this);
                // find only rows with data
                if ($row.attr('data-id')) {
                    export_row = [];
                    checked = $row.find('th input[type=checkbox]').attr("checked");
                    $.each(export_columns_keys, function () {
                        cell = $row.find('td[data-field="' + this + '"]').get(0);
                        text = cell.text || cell.textContent || cell.innerHTML || "";
                        if (cell.classList.contains("o_list_number")) {
                            export_row.push(formats.parse_value(text, {'type': "float"}, 0));
                        }
                        else if (cell.classList.contains("oe_list_field_boolean")) {
                            var data_id = $('<div>' + cell.innerHTML + '</div>');
                            if (data_id.find('input').get(0).checked) {
                                export_row.push(_t("True"));
                            }
                            else {
                                export_row.push(_t("False"));
                            }
                        }
                        else if (cell.classList.contains("oe_list_field_integer")) {
                            var tmp2 = text;
                            export_row.push(parseInt(tmp2));
                        }
                        else {
                            export_row.push(text.trim());
                        }
                    });
                    export_rows.push(export_row);
                }
            });
            $.blockUI();
            self.session.get_file({
                url: '/web/export/xls_view',
                data: {data: JSON.stringify({
                    model: view.model,
                    headers: export_columns_names,
                    rows: export_rows
                })},
                complete: $.unblockUI
            });
        }
    })

});
