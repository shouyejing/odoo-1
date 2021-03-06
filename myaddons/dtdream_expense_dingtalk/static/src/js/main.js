/**
 * @author 清水<54773801@qq.com>
 *     @class DingtalkUI
 */
odoo.define('dtdream_expense_dingtalk.ui', function (require) {
    "use strict";
    var core = require('web.core');
    var session = require('web.session');
    var Widget = require('web.Widget');
    var time_module = require('web.time');
    var Model = require('web.Model');

    var QWeb = core.qweb;

    /**
     * @class Main
     * @classdesc 主界面
     */
    var Main = Widget.extend({
        /**
         * @memberOf Main
         * @member template
         * @description 模板名称,可以在src/xml/expense.xml中查找到main
         */
        template: 'main',
        /**
         * @memberOf Main
         * @method init
         * @description 初始化,参考widget.js
         * @param {object} parent 父级传递的参数
         */
        init: function (parent) {
            var self = this;
            self._super(parent);
            self.load_template();

            core.bus.on('change_screen', this, this.go_to_screen);
        },
        /**
         * @memberOf Main
         * @member events
         * @description 定义事件
         */
        events: {
            /**主工具栏*/
            'click .tab-item': 'on_open_item',
        },
        /**
         * @memberOf Main
         * @description 介于init与start方法之间执行，具体参考widget.js
         * @returns {*|Promise|Promise.<TResult>}
         */
        willStart: function () {
            var self = this;
            return session.session_reload().then(function () {
                console.log(session.username);
                console.log(session);
                self.user = session.username;
                self.uid = session.uid;
            });
        },
        /**
         * @memberOf Main
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function (parent) {
            this._super(parent);
            var self = this;
            var screen_defs = [];

            this.expense_screen = new Expense_screen();
            this.expense_detail_screen = new Expense_detail_screen();
            this.report_screen = new Report_screen();
            this.report_detail_screen = new Report_detail_screen();
            this.workflow_screen = new Workflow_screen();
            this.my_screen = new My_screen();
            this.have_check_screen = new Havecheck_screen();
            this.outtime_screen = new Outtime_screen();
            this.havepay = new Havepay_screen();

            /**
             * @description 界面id
             * @memberOf Main
             * @enum {string}
             * @type {{expense: *, expense_detail: *, report: *, report_detail: *, workflow: *, my: *, have_check: *, outtime: *, havepay: *}}
             */
            this.map_ids_to_widgets = {
                /**消费明细列表*/
                'expense': this.expense_screen,
                /**消费明细新增编辑*/
                'expense_detail': this.expense_detail_screen,
                /**报销申请列表*/
                'report': this.report_screen,
                /**报销申请明细内容*/
                'report_detail': this.report_detail_screen,
                /**待我审批的报销申请*/
                'workflow': this.workflow_screen,
                /**我的*/
                'my': this.my_screen,
                /**我已审批的报销申请*/
                'have_check': this.have_check_screen,
                /**已超期的报销申请*/
                'outtime': this.outtime_screen,
                /**已付款的报销申请*/
                'havepay': this.havepay,
            }

            this.expense_screen.uid = this.uid;
            screen_defs.push(this.expense_screen.appendTo($('.o_main_content')));

            self.current_screen = self.expense_screen;

            var reg = new RegExp("(^|&)item-id=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
            var r = window.location.search.substr(1).match(reg);  //匹配目标参数
            if (r) {
                self.$('a[data-item-id=' + r[2] + ']').click();
            }
        },
        /**
         * @memberOf Main
         * @description 在主窗口上切换界面
         * @param ｛object} args 主要传递界面id,以及options，id参考map_ids_to_widgets
         */
        go_to_screen: function (args) {
            var self = this;
            var next_screen = this.map_ids_to_widgets[args.id];
            if (next_screen) {
                next_screen.uid = this.uid;
                this.current_screen.detach();
                if (next_screen.has_been_loaded === false) {
                    next_screen.appendTo($('.o_main_content'));
                }

                if (args.options) {
                    args.options['offset'] = 10;
                    args.options['have_next_page'] = true;
                    args.options['is_loading'] = false;
                } else {
                    args.options = {
                        'offset': 0,
                        'have_next_page': true,
                        'is_loading': false
                    };
                }
                next_screen.attach($('.o_main_content'), args.options);
                this.current_screen = next_screen;
            }

        },
        /**
         * @memberOf Main
         * @method load_template
         * @description 加载qweb界面
         */
        load_template: function () {
            var xml = $.ajax({
                url: "static/src/xml/expense.xml?version=31",
                async: false // necessary as without the template there isn't much to do.
            }).responseText;
            QWeb.add_template(xml);
        },
        /**
         * @memberOf Main
         * @description 点击主工具栏时触发界面跳转
         * @param {object}ev dom对象
         */
        on_open_item: function (ev) {

            core.bus.trigger('change_screen', {
                id: $(ev.currentTarget).data('item-id'),
            });
            // this.$el.removeClass('shown');
        },
    });

    /**
     * @class BasicScreenWidget
     * @classdesc 基础对象,继承自widget
     */
    var BasicScreenWidget = Widget.extend({
        /**
         * @memberOf BasicScreenWidget
         * @method init
         * @description 初始化,参考widget.js
         * @param {object} parent 父级传递的参数
         */
        init: function (parent) {
            this._super(parent);
            this.has_been_loaded = false;
        },
        /**
         * @memberOf BasicScreenWidget
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self.has_been_loaded = true;
            });
        },
        /**
         * @memberOf BasicScreenWidget
         * @description 加载qweb模板内容以及传递参数
         * @param {object}el dom 对象
         * @param {object}options 参数
         */
        attach: function (el, options) {
            if (options) {
                this.options = options;
            }
            this.renderElement();
            this.$el.appendTo(el);
            this.setTitle();
        },
        /**
         * @memberOf BasicScreenWidget
         * @description 释放qweb模版内容
         */
        detach: function () {
            this.$el.detach();
            this.didDetach();
        },
        /**
         * @memberOf BasicScreenWidget
         * @description 释放qweb模版内容后执行其他的方法
         */
        didDetach: function () {
            $('.o_main_bar').show();
            return;
        },
        /**
         * @memberOf BasicScreenWidget
         * @description 调用钉钉api, 设置钉钉Title
         */
        setTitle: function () {

            dd.biz.navigation.setTitle({
                title: this.title,//控制标题文本，空字符串表示显示默认文本
                onSuccess: function (result) {
                },
                onFail: function (err) {
                }
            });
        }
    });

    /**
     * @class Expense_screen
     * @classdesc 消费明细列表
     * @augments BasicScreenWidget
     */
    var Expense_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Expense_screen
         * @description 模版名称
         */
        'template': 'expense',
        'is_select': false,
        'eidt_type': "",
        /**
         * @memberOf Expense_screen
         * @method init
         * @description 初始化,参考widget.js
         * @param {object} parent 父级传递的参数
         */
        'init': function (parent) {
            var self = this;
            self._super(parent);
        },
        /**
         * @memberOf Expense_screen
         * @member events
         * @description 定义事件
         * @property {method} edit_expense 点击消费列表行，进入明细界面
         * @property {method} show_select_expense 勾选需要生成报销申请的消费明细列表
         * @property {method} action_button 选择要消费明细后，要执行的事件
         * @property {method} select_expense 点击消费列表内容
         */
        events: {
            'click .o_expense_list': 'edit_expense',
            'click .o_select_expense_list': 'show_select_expense',
            'click .tab-item': 'action_button',
            'click .o_select_expense': 'select_expense',

        },
        /**
         * @memberOf Expense_screen
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function (parent) {
            var self = this;
            self._super(parent);
            this.setTitle();
            this.condition = [['create_uid', '=', this.uid], ['report_ids', '=', false]];
            this.rend_navigate_button();
            this.load_data(this);
        },
        /**
         * @memberOf Expense_screen
         * @method select_expense
         * @description 点击消费列表内容停止冒泡
         * @param {object}e dom对象
         */
        select_expense: function (e) {
            e.stopPropagation();
        },
        /**
         * @memberOf Expense_screen
         * @description 工具栏事件
         * @param  {object} ev dom对象
         * @property {string} cancel_create_report 取消选择的消费列表行
         * @property {string} create_report 创建报销申请
         */
        action_button: function (ev) {
            ev.preventDefault();
            var self = this;
            if ($(ev.currentTarget).data('item-id') == 'cancel_create_report') {
                this.$('.o_select_expense').hide();
                this.$('.o_create_report').hide();
                this.$('.o_title_expense').show();
                $('.o_main_bar').show();
                this.is_select = false;
                $.each(this.$('input[name=ck_expense]'), function (key, value) {
                    if (value.checked) {
                        value.checked = false;
                    }
                });
            }
            if ($(ev.currentTarget).data('item-id') == 'create_report') {
                var expense_ids = [];
                $.each(this.$('input[name=ck_expense]'), function (key, value) {
                    if (value.checked) {
                        expense_ids.push(parseInt($(value).data('id')));
                    }
                });
                if (expense_ids == 0) {
                    $.alert('请先选择费用明细。');
                } else {
                    var context = {
                        active_model: 'dtdream.expense.record',
                        active_ids: expense_ids,
                    }

                    new Model('dtdream.expense.record').call('create_expense_record_baoxiao', {context: context}).then(function (records) {
                        console.log(records);
                        $('.o_main_bar').show();
                        core.bus.trigger('change_screen', {
                            id: 'report',
                        });
                    }, function (err) {
                        $.alert(err.data.message);
                    });


                }
            }
        },
        /**
         *  @memberOf Expense_screen
         *  @description 选择消费列表行
         * @param {object} e dom对象
         */
        show_select_expense: function (e) {
            e.preventDefault();
            this.$('.o_select_expense').show();
            this.$('.o_create_report').show();
            this.$('.o_title_expense').hide();
            $('.o_main_bar').hide();
            this.is_select = true;
            e.stopPropagation();
        },
        /**
         * @memberOf Expense_screen
         * @description 调用钉钉api,在钉钉界面右上角显示一个"新增"按钮，可以导航到新增消费明细界面
         * @param {object} parent 传递父对象
         */
        rend_navigate_button: function (parent) {

            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                text: '新增',//控制显示文本，空字符串表示显示默认文本
                iconId: "add",
                onSuccess: function (result) {
                    //如果control为true，则onSuccess将在发生按钮点击事件被回调
                    /*
                     {}
                     */
                    core.bus.trigger('change_screen', {
                        id: 'expense_detail',
                        options: {
                            'edit_type': 'create',
                        }
                    });
                },
                onFail: function (err) {
                }
            });

            // dd.biz.navigation.setMenu({
            //     backgroundColor: "#ADD8E6",
            //     items: [
            //         {
            //             "id": "1",//字符串
            //             "iconId": "add",//字符串，图标命名
            //             "text": "新增"
            //         }
            //     ],
            //     onSuccess: function (data) {
            //         core.bus.trigger('change_screen', {
            //             id: 'expense_detail',
            //             options: {
            //                 'edit_type': 'create',
            //             }
            //         });
            //
            //
            //     },
            //     onFail: function (err) {
            //     }
            // });
        },
        /**
         * @memberOf Expense_screen
         * @description 选择消费明细行，进入消费明细界面
         * @param {object} ev dom对象
         */
        edit_expense: function (ev) {
            ev.preventDefault();
            if (!this.is_select) {
                var expense_id = $(ev.currentTarget).data('id');
                $.each(this.expense_records, function (key, value) {
                    if (value.id == expense_id) {
                        core.bus.trigger('change_screen', {
                            id: 'expense_detail',
                            options: {
                                'expense': value,
                                'edit_type': 'edit',
                            }
                        });
                    }
                })
            }

        },
        /**
         * @memberOf Expense_screen
         * @method load_data
         * @description 调用rpc从服务端获取未生成报销申请的消费明细数据，显示在界面上
         * @param ｛object}parent 传递父对象
         * @returns {jQuery.Deferred}
         */
        load_data: function (parent) {
            var self = this;
            var def = new $.Deferred();
            new Model('dtdream.expense.record')
                .query(['id', 'name', 'expensecatelog', 'expensedetail', 'invoicevalue', 'city', 'province', 'currentdate', 'write_date'])
                .filter(this.condition)
                .order_by('-currentdate')
                .all({'timeout': 3000, 'shadow': true})
                .then(function (expense_records) {
                        self.expense_records = expense_records;
                        if (parent.render_data(expense_records, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
            return def;
        },
        /**
         * @memberOf Expense_screen
         * @description 将服务端获取的消费明细数据显示在界面上
         * @param {json} expense_records 消费明细
         * @param {object} $el dom对象
         */
        render_data: function (expense_records, $el) {
            var $expense_records = $(QWeb.render('expense_list', {'expense_records': expense_records}));
            $el.find('.o_expense').prepend($expense_records);
            // $users.appendTo('.o_expense');
        },
        /**
         * @memberOf Expense_screen
         * @description 显示消费列表界面
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            this.load_data(this);
            this.rend_navigate_button();
            this._super(el, options);
        },
        /**
         * @memberOf Expense_screen
         * @description 跳转至另外一个页面前,清空钉钉页面右上角按钮。
         */
        didDetach: function () {
            dd.biz.navigation.setRight({
                show: false,//控制按钮显示， true 显示， false 隐藏， 默认true
            });
        },
        /**
         * @memberOf Expense_screen
         * @description 设置钉钉页面抬头内容
         */
        setTitle: function () {
            this.title = "未报销的消费明细"
            this._super();
        }
    });

    /**
     * @class Expense_detail_screen
     * @classdesc 消费明细详细内容界面
     */
    var Expense_detail_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Expense_detail_screen
         * @member template
         * @description 消费明细详细内容界面模版名称
         */
        template: 'expense_detail_screen',
        /**
         * @memberOf Expense_detail_screen
         * @member events
         * @description 事件
         * @property {method} action_button 点击工具栏按钮事件
         * @property {method} get_expensedetail 加载消费项目界面事件
         * @property {method} get_province_city 加载省份城市界面事件
         * @property {method} on_file_change 上传图片事件
         * @property {method} preview_image 预览图片事件
         * @property {method} delete_image 删除图片事件
         */
        events: {
            'click .tab-item': 'action_button',
            // 'click .o_expense_map': 'get_map_address',
            'click input[data-id=expensedetail]': 'get_expensedetail',
            'click input[data-id=province_city]': 'get_province_city',
            'change .o_uploader_input': 'on_file_change',
            'click .o_uploader_file': 'preview_image',
            'click .o_expense_delete': 'delete_image',
            // 'keydown input[data-id=invoicevalue]': 'check_invoicevalue'
        },

        // check_invoicevalue: function () {
        //
        // },
        /**
         * @memberOf Expense_detail_screen
         * @method delete_image
         * @description 删除图片
         * @param {object} e dom对象
         */
        delete_image: function (e) {
            e.preventDefault();
            var li = e.currentTarget.parentNode.parentNode
            if ($(li).data('id')) {
                $(li).hide();
            } else {
                $(li).detach();
            }

            e.stopPropagation();
        },
        /**
         * @memberOf Expense_detail_screen
         * @description 预览图片
         * @param {object} e dom对象
         */
        preview_image: function (e) {
            e.preventDefault();
            var urls = [];
            $.each(this.$('.o_uploader_file'), function (key, value) {
                var url = value.style.backgroundImage;
                url = url.replace('url(', "")
                url = url.replace(')', "")
                url = url.replace('"', "");
                urls.push(url);
            });
            if (urls.length > 0) {
                var photos = $.photoBrowser({
                    photos: urls,
                    type: 'popup'
                });
                photos.open();
            }
        },
        /**
         * @memberOf Expense_detail_screen
         * @description 上传图片
         * @param {object} e dom对象
         */
        on_file_change: function (e) {
            var self = this;
            var file_node = e.target;
            // var file = file_node.files[0];
            $.each(file_node.files, function (key, value) {
                var file = value;
                lrz(file)
                    .then(function (rst) {
                        // 处理成功会执行
                        var $expense_img = $(QWeb.render('Expense-img', {'url': rst.base64}));
                        $expense_img.appendTo('.o_expense_img')
                    })
                    .catch(function (err) {
                        // 处理失败会执行
                    })
                    .always(function () {
                        // 不管是成功失败，都会执行
                    });
            });

            // var filereader = new FileReader();
            // filereader.readAsDataURL(file);
            // var def = new $.Deferred();
            //
            // filereader.onloadend = function (upload) {
            //     var data = upload.target.result;
            //     data = data.split(',')[1];
            //     var url = 'data:image/png;base64,' + data;
            //     var $expense_img = $(QWeb.render('Expense-img', {'url': url}));
            //     $expense_img.appendTo('.o_expense_img')
            //     // var html='<img src='+url+'>';
            //     // console.log(html);
            //     // $('.o_attachment_list').append('<div id=o_img><div class="o_img_left"><img class=o_avatar src='+url+'><i class="icon iconfont">&#xe78a;</i></div></div>')
            //     // console.log(data);
            //     // self.on_file_uploaded(file.size, file.name, file.type, data);
            // };
            // console.log(file_node);
        },
        /**
         * @memberOf Expense_detail_screen
         * @description 显示消费明细详细内容
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            $('.o_main_bar').hide();
            console.log(el);
            this._super(el, options);
            this.$('#currentdate').calendar();

            if (this.options && this.options.expense) {
                this.title = "未报销消费明细";

                this.expense = this.options.expense;
                this.$('input[data-id=expensedetail]').val(this.expense.expensedetail[1]);
                this.$('input[data-id=expensedetail]').data('expensecatelog-id', this.expense.expensecatelog[0]);
                this.$('input[data-id=expensedetail]').data('expensedetail-id', this.expense.expensedetail[0]);
                this.$('input[data-id=invoicevalue]').val(this.expense.invoicevalue);
                this.$('input[data-id=currentdate]').val(this.expense.currentdate);
                this.$('input[data-id=province_city]').val((this.expense.province ? this.expense.province[1] : "") + (this.expense.city ? ("-" + this.expense.city[1]) : ""))
                this.$('input[data-id=province_city]').data('province-id', this.expense.province ? this.expense.province[0] : "");
                this.$('input[data-id=province_city]').data('city-id', this.expense.city ? this.expense.city[0] : "");

                var def = new $.Deferred();
                new Model('dtdream.expense.record.attachment').query(['id', 'record_id', 'attachment', 'write_date'])
                    .filter([['record_id', '=', this.expense.id]])
                    .all({'timeout': 3000, 'shadow': true})
                    .then(function (attachments) {
                        console.log(attachments);
                        $.each(attachments, function (key, value) {
                            var url = session.url('/web/image', {
                                model: 'dtdream.expense.record.attachment',
                                id: value.id,
                                field: 'image',
                                unique: (value.write_date || '').replace(/[^0-9]/g, ''),
                            });
                            var $expense_img = $(QWeb.render('Expense-img', {url: url, id: value.id}));
                            $expense_img.appendTo('.o_expense_img')
                        });
                        def.resolve();
                    });
            }

        },
        /**
         * @memberOf Expense_detail_screen
         * @description 显示钉钉界面抬头内容
         */
        setTitle: function () {
            if (this.options && this.options.expense) {
                this.title = "未报销的消费明细";
            } else {
                this.title = "消费明细"
            }
            this._super();
        },
        /**
         * @memberOf Expense_detail_screen
         * @param {object} ev dom对象
         * @property {string} cancel 取消编辑后，返回消费明细列表界面
         * @property {string} save 保存消费明细后，返回消费明细列表界面
         * @property {string} delete 删除消费明细后，返回消费明细列表接 main
         */
        action_button: function (ev) {
            ev.preventDefault();
            var self = this;
            if ($(ev.currentTarget).data('item-id') == 'cancel') {
                core.bus.trigger('change_screen', {
                    id: 'expense',
                });
            }
            if ($(ev.currentTarget).data('item-id') == 'save') {
                var expense_detail = {
                    'expensecatelog': this.$('input[data-id=expensedetail]').data('expensecatelog-id'),
                    'expensedetail': this.$('input[data-id=expensedetail]').data('expensedetail-id'),
                    'invoicevalue': this.$('input[data-id=invoicevalue]').val(),
                    'currentdate': this.$('input[data-id=currentdate]').val(),
                    'province': this.$('input[data-id=province_city]').data('province-id'),
                    'city': this.$('input[data-id=province_city]').data('city-id'),
                };

                if (!expense_detail.expensecatelog || !expense_detail.expensedetail) {
                    $.alert('请输入费用明细')
                    return;
                }

                if (!expense_detail.currentdate) {
                    $.alert('请输入发生日期');
                    return;
                }

                if (!$.isNumeric(expense_detail.invoicevalue)) {
                    $.alert('费用金额应该为数字');
                    return;
                }

                var def = new $.Deferred();
                ev.expense = self.expense;

                // $.showIndicator();

                if (this.options.edit_type == "edit") {
                    new Model('dtdream.expense.record').call('read', [[self.expense.id], ['id', 'write_date']]).then(function (records) {
                        if (records) {
                            if (records[0].write_date == ev.expense.write_date) {
                                var attachment_ids = []
                                $.each(self.$('.o_uploader_status'), function (key, value) {
                                    if (!$(value).data("id")) {
                                        var url = value.style.backgroundImage;
                                        url = url.replace('url(', "")
                                        url = url.replace(')', "")
                                        url = url.replace('"', "");
                                        url = url.replace("data:image/jpeg;base64,", "")
                                        attachment_ids.push([0, 0, {
                                            'image': url,
                                        }])
                                    }
                                    if ($(value).is(":hidden")) {
                                        attachment_ids.push([2, parseInt($(value).data('id'))])
                                    }
                                });
                                if (attachment_ids.length > 0) {
                                    expense_detail.attachment_ids = attachment_ids;
                                }
                                $.when(new Model('dtdream.expense.record').call('write', [[self.expense.id], expense_detail])).then(function () {
                                    // $.hideIndicator();
                                    $.toast("保存成功");
                                    core.bus.trigger('change_screen', {
                                        id: 'expense',
                                    });

                                }, function (err) {

                                    $.alert(err.data.message.replace('None', ""));
                                });
                            }
                            else {
                                $.toast('数据已经被修改,请刷新数据。');
                                core.bus.trigger('change_screen', {
                                    id: 'expense',
                                });
                            }
                        } else {
                            $.toast('没有找到对应的纪录。');
                            core.bus.trigger('change_screen', {
                                id: 'expense',
                            });
                        }

                        def.resolve();
                    });
                }
                if (this.options.edit_type == "create") {
                    $.when(new Model('dtdream.expense.record').call('create', [expense_detail])).then(function () {
                        $.toast("保存成功");

                        core.bus.trigger('change_screen', {
                            id: 'expense',
                        });

                    });
                }


            }
            if ($(ev.currentTarget).data('item-id') == 'delete') {
                var def = new $.Deferred();
                ev.expense = self.expense;
                new Model('dtdream.expense.record').call('read', [[self.expense.id], ['id', 'write_date', 'report_ids']]).then(function (records) {
                    if (records) {
                        if (records[0].write_date == ev.expense.write_date) {
                            $.confirm('您确定要删除此条记录吗?',
                                function () {
                                    $.when(new Model('dtdream.expense.record').call('unlink', [[self.expense.id]])).then(function () {
                                        $.toast("删除成功");
                                        core.bus.trigger('change_screen', {
                                            id: 'expense',
                                        });

                                    });
                                },
                                function () {

                                }
                            );

                        } else {
                            $.toast('数据已经被修改,请刷新数据。');
                            core.bus.trigger('change_screen', {
                                id: 'expense',
                            });
                        }
                    } else {
                        $.toast('没有找到对应的纪录,删除失败。');
                        core.bus.trigger('change_screen', {
                            id: 'expense',
                        });
                    }
                    def.resolve();
                });
            }
        },
        /**
         * @memberOf Expense_detail_screen
         * @description 打开费用项目界面进行选择
         * @param {object} ev dom对象
         */
        get_expensedetail: function (ev) {

            var self = this;
            if (!self.expense_catelog) {
                self.expense_catelog = new Expense_category_screen()
            }
            self.expense_catelog.appendTo('.o_expense_catelog')
            ev.currentTarget.blur();
            $.popup('.popup-catelog');
            $('.o_main_bar').hide();
            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                text: '取消',//控制显示文本，空字符串表示显示默认文本
                onSuccess: function (result) {

                    self.expense_catelog.detach();
                    $.closeModal();
                    $('.o_main_bar').hide();
                    dd.biz.navigation.setRight({
                        show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                        control: false,
                    });
                },
                onFail: function (err) {
                }
            });
        },
        /**
         * @memberOf Expense_detail_screen
         * @description 打开城市列表界面进行选择
         * @param {object} ev dom对象
         */
        get_province_city: function (ev) {
            var self = this;
            if (!self.province_city) {
                self.province_city = new Province_city_screen();
            }
            self.province_city.appendTo('.o_province_city');

            $.popup('.popup-province_city');
            $('.o_main_bar').hide();

            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                text: '取消',//控制显示文本，空字符串表示显示默认文本
                onSuccess: function (result) {

                    self.province_city.detach();
                    $.closeModal();
                    $('.o_main_bar').hide();
                    dd.biz.navigation.setRight({
                        show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                        control: false,
                    });
                },
                onFail: function (err) {
                }
            });
        }
        ,
        // get_map_address: function (ev) {
        //     var self = this;
        //     console.log(this.$el);
        //     logger.i("fuck you");
        //     dd.device.geolocation.get({
        //         targetAccuracy: 2000,
        //         coordinate: 1,
        //         withReGeocode: true,
        //         onSuccess: function (result) {
        //             // alert(result);
        //
        //             self.$('input[data-id=city]').val(result.province + '-' + result.city);
        //         },
        //         onFail: function (err) {
        //             alert('error')
        //             alert(err.toString())
        //         }
        //     });
        // }

    });

    /**
     * @class Report_screen
     * @augments BasicScreenWidget
     * @classdesc 报销申请列表界面
     */
    var Report_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Report_screen
         * @description 报销申请列表模板名称
         */
        template: 'report',
        /**
         * @memberOf Report_screen
         * @description 事件
         * @property {method} edit_expense_report 打开报销申请明细内容界面
         * @property {method} tijiao 提交所选择的报销申请
         * @property {method} cuiban 催办所提交的报销申请
         * @property {method} get_next_page 加载下一页的报销申请
         */
        events: {
            'click .item-content': 'edit_expense_report',
            'click .o_report_tijiao': 'tijiao',
            'click .o_report_cuiban': 'cuiban',
            'click .next_report_page': 'get_next_page',
        },
        /**
         * @memberOf Report_screen
         * @description 加载下一页报销申请数据
         */
        get_next_page: function () {
            var self = this;
            // $.alert('ok');
            if (self.options['have_next_page'] && !self.options['is_loading']) {
                self.options['is_loading'] = true;
                self.load_data(self);
            }
            // else {
            //     self.$('.infinite-scroll-preloader').hide();
            // }
        },
        /**
         * @memberOf Report_screen
         * @description 提交所选择的报销申请，执行服务端的workflow-btn_submit
         * @param {object} ev dom对象
         */
        tijiao: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var id = parseInt($(ev.currentTarget.parentNode).data('id'));
            new Model('dtdream.expense.report').exec_workflow(id, 'btn_submit').then(function (result) {
                console.log(result);
                $.toast("提交成功");
                core.bus.trigger('change_screen', {
                    id: 'report',
                });
            }, function (err) {
                console.log(err);
                $.alert(err.data.message);
            });
        },
        /**
         * @memberOf Report_screen
         * @description 催签，执行服务端方法btn_cuiqian
         * @param {object} ev dom对象
         */
        cuiban: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();

            $.confirm('确定要催签吗?', function () {
                var id = parseInt($(ev.currentTarget.parentNode).data('id'));
                new Model('dtdream.expense.report').call_button('btn_cuiqian', [[id]]).then(function (result) {
                    $.toast("催签完成");
                }, function (err) {
                    $.alert(err.data.message);
                });
            });
        },
        /**
         * @memberOf Report_screen
         * @method init
         * @description 初始化,参考widget.js
         * @param {object} parent 父级传递的参数
         */
        init: function (parent) {
            var self = this;
            self._super(parent);

        },
        /**
         * @memberOf Report_screen
         * @description 跳转到报销申请明细内容界面
         * @param {object} ev dom对象
         */
        edit_expense_report: function (ev) {
            var expense_report_id = $(ev.currentTarget).data('id');
            $.each(this.expense_reports, function (key, value) {
                if (value.id == expense_report_id) {
                    core.bus.trigger('change_screen', {
                        id: 'report_detail',
                        options: {
                            'expense_report': value,
                        }
                    });
                }
            })

        },
        /**
         * @memberOf Report_screen
         * @description 从服务端加载报销申请数据，每页为20条
         * @param {object} parent 扶对象
         * @returns {jQuery.Deferred}
         */
        load_data: function (parent) {
            var def = new $.Deferred();
            var self = this;
            self.i = 0;
            new Model('dtdream.expense.report')
                .query(['id', 'name', 'state', 'paytype', 'total_invoicevalue', 'paycatelog', 'shoukuanrenxinming',
                    'kaihuhang', 'yinhangkahao', 'expensereason', 'create_uid', 'create_date', 'write_date', 'showcuiqian', 'currentauditperson',
                    'currentauditperson_userid', 'hasauditor', 'is_outtime', 'xingzhengzhuli', 'department_id', 'create_uid_self'])
                .filter(self.options.condition)
                .limit(10)
                .offset(self.options.offset)
                .order_by(['-name'])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (expense_reports) {
                        console.log(expense_reports);

                        if (self.i == 0) {
                            if (expense_reports.length < 10) {
                                self.options['have_next_page'] = false;
                                // self.$('.infinite-scroll-preloader').hide();
                                dd.biz.navigation.setRight({
                                    show: false,//控制按钮显示， true 显示， false 隐藏， 默认true
                                });
                            }
                            else {
                                dd.biz.navigation.setRight({
                                    show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                                    control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                                    text: '下一页',//控制显示文本，空字符串表示显示默认文本
                                    onSuccess: function (result) {
                                        parent.get_next_page(parent);
                                    },
                                    onFail: function (err) {
                                    }
                                });
                            }
                            self.options['offset'] = self.options['offset'] + 10;
                            self.options['is_loading'] = false;
                            var states = {
                                'draft': '草稿',
                                'xingzheng': '行政助理审批',
                                'zhuguan': '主管审批',
                                'quanqianren': '权签人审批',
                                'jiekoukuaiji': '接口会计审批',
                                'daifukuan': '待付款',
                                'yifukuan': '已付款'
                            }
                            $.each(expense_reports, function (key, value) {
                                value.state_name = states[value.state];
                            });
                            self.expense_reports = expense_reports;
                            if (parent.render_data(expense_reports, parent.$el, parent)) {
                                def.resolve();

                            } else {
                                def.reject();
                            }
                            self.i++;
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
            return def;
        },
        /**
         * @memberOf Report_screen
         * @description 显示报销申请数据到界面上
         * @param {json} expense_reports 报销申请数据
         * @param ｛object} $el dom对象
         */
        render_data: function (expense_reports, $el) {
            var show_name_type = "";
            if (this.title == "待我审批的报销申请") {
                show_name_type = "create_uid_self"
            }

            if (this.title == "未完成报销申请") {
                show_name_type = "currentauditperson"
            }

            if (expense_reports) {
                var $expense_reports = $(QWeb.render('report_list', {
                    'expense_reports': expense_reports,
                    'show_name_type': show_name_type
                }));

                $el.find('.o_report').append($expense_reports);

            }
        },
        /**
         * @memberOf Report_screen
         * @description 显示消费列表界面
         * @param {object}el dom 对象
         * @param {object}options 参数
         */
        attach: function (el, options) {
            var self = this;
            if (!options['condition']) {
                options['condition'] = [['create_uid', '=', self.uid], ['state', '!=', 'yifukuan']];
            }
            this._super(el, options);

            this.load_data(this);
        },
        /**
         * @memberOf Report_screen
         * @description 跳转至下一个页面前，清空钉钉右上角按钮
         */
        didDetach: function () {
            dd.biz.navigation.setRight({
                show: false,//控制按钮显示， true 显示， false 隐藏， 默认true
            });
        },
        /**
         * @memberOf Report_screen
         * @description 显示钉钉界面抬头
         */
        setTitle: function () {
            if (!this.title) this.title = "未完成报销申请";
            this._super();
        }
    });

    /**
     * @class Report_detail_screen
     * @description 报销申请明细界面
     */
    var Report_detail_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Report_detail_screen
         * @description 报销申请明细界面模板名称
         */
        template: 'expense_report_detail',
        /**
         * @memberOf Report_detail_screen
         * @description 事件
         * @property {method} action_button 工具栏事件
         * @property {method} action_paytype 选择支付方式事件
         * @property {method} action_paycatelog 选择支付类别事件
         * @property {method} add_expense 添加报销申请事件
         * @property {method} add_benefitdep 添加分摊比例事件
         * @property {method} get_dep 获取分摊比例所属部门事件
         * @property {method} select_dep 打开部门界面事件
         * @property {method} delete_benefitdep 删除分摊比例事件
         * @property {method} delete_report_expense 删除消费明细事件
         * @property {method} edit_benefitdep 编辑分摊比例事件
         * @property {method} select_reject_state 选择拒绝申请后，接收人事件
         * @property {method} search_expense_record 搜索报销申请事件
         * @property {method} add_chuchai 添加出差明细事件
         * @property {method} select_chuchai 选择出差明细事件
         * @property {methdd} delete_report_chuchai 删除出差明细事件
         * @property {method} search_chuchai 选择出差明细事件
         * @property {method} get_xingzhengzhuli 打开行政助理选择界面
         * @property {method} search_department 搜索部门
         */
        events: {
            'click .tab-item': 'action_button',
            'click input[data-id=paytype]': 'action_paytype',
            'click input[data-id=paycatelog]': 'action_paycatelog',
            'click .o_add_expense': 'add_expense',
            'click .o_add_benefitdep': 'add_benefitdep',
            'click input[data-name=dep_name]': 'get_dep',
            'click .o_select_dep': 'select_dep',
            'click .o_delete_benefitdep': 'delete_benefitdep',
            'click .o_delete_report_expense': 'delete_report_expense',
            'click .o_benefitdep_list': 'edit_benefitdep',
            'click .o_reject_state': 'select_reject_state',
            'keyup .o_search_expense_record': 'search_expense_record',
            'click .o_add_chuchai': 'add_chuchai',
            'click .o_select_chuchai': 'select_chuchai',
            'click .o_delete_report_chuchai': 'delete_report_chuchai',
            'keyup .o_search_chuchai': 'search_chuchai',
            'click input[data-id=xingzhengzhuli]': 'get_xingzhengzhuli',
            'keyup .o_search_department': 'search_department',
            'keyup .o_search_xingzengzhuli': 'search_xingzhengzhuli',
            'click .o_select_xingzhengzhuli': 'select_xingzhengzhuli',
        },
        /**
         * @memberOf Report_detail_screen
         * @description 搜索行政助理
         * @param {object} ev dom对象
         */
        search_xingzhengzhuli: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_report_xingzhengzhuli').empty();

                this.get_xingzhengzhuli(this);
            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 选择行政助理
         * @param {object} e dom对象
         */
        select_xingzhengzhuli: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this;

            var id = $(e.currentTarget).data('id');
            if (self.xingzhengzhulis) {
                $.each(self.xingzhengzhulis, function (key, value) {
                    if (value.id == id) {
                        $('input[data-id=xingzhengzhuli]').val(value.name);
                        $('input[data-id=xingzhengzhuli]').data('xingzhengzhuli-id', value.id);
                    }
                });
            }

            self.$('.o_report_xingzhengzhuli').empty();
            $.closeModal();
        },
        /**
         * @memberOf Report_detail_screen
         * @description 搜索消费明细
         * @param {object} ev dom对象
         */
        search_department: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_report_department').empty();

                this.get_dep(this);
            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端获取行政助理数据
         * @param {object} e dom对象
         */
        get_xingzhengzhuli: function (e) {
            var self = this;
            if (self.options.expense_report.state != 'draft')return;
            self.$('.o_report_xingzhengzhuli').empty();
            var def = $.Deferred();

            new Model('hr.department').query('id', 'name', 'assitant_id')
                .filter([['id', '=', self.expense_report.department_id[0]]])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (dep) {
                    var condition = [];

                    if (dep.length > 0) {
                        $.each(dep, function (key, value) {
                            condition.push(['id', 'in', value.assitant_id])
                        });
                    }

                    var value = $('.o_search_xingzhengzhuli').val()
                    if (value) {
                        condition.push(['name', 'ilike', value]);
                    }
                    new Model('hr.employee').query(['id', 'name',])
                        .filter(condition)
                        .all({'timeout': 3000, 'shadow': true})
                        .then(function (xingzhengzhulis) {
                            self.xingzhengzhulis = xingzhengzhulis;
                            if (self.rend_xingzhengzhuli(xingzhengzhulis, self.$('.o_report_xingzhengzhuli'))) {
                                def.resolve();
                            } else {
                                def.reject();
                            }
                        }, function (err, event) {
                            event.preventDefault();
                            def.reject();
                        });
                });


            $.popup('.popup-xingzhengzhuli');

            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                text: '取消',//控制显示文本，空字符串表示显示默认文本
                onSuccess: function (result) {

                    self.$('.o_report_xingzhengzhuli').empty();
                    $.closeModal();
                    dd.biz.navigation.setRight({
                        show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                        control: false,
                    });
                },
                onFail: function (err) {
                }
            });

        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示行政助理
         * @param {json} xingzhengzhlis 行政助理
         * @param {object} $el dom 对象
         */
        rend_xingzhengzhuli: function (xingzhengzhlis, $el) {
            var $xingzhengzhlis = $(QWeb.render('xingzhengzhuli', {'xingzhengzhulis': xingzhengzhlis}));
            $el.prepend($xingzhengzhlis);
        },
        /**
         * @memberOf Report_detail_screen
         * @description 搜索出差明细
         * @param {object} ev dom对象
         */
        search_chuchai: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_report_chuchai').empty();

                this.load_chuchai(this);
            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 删除出差明细
         * @param {object} e dom对象
         */
        delete_report_chuchai: function (e) {
            e.preventDefault();
            var li = e.currentTarget.parentNode.parentNode;
            if ($(li).data('id')) {
                $(li).hide();
            } else {
                $(li).detach();
            }

            e.stopPropagation();
        },
        /**
         * @memberOf Report_detail_screen
         * @description 选择出差明细
         * @param {object} ev dom对象
         */
        select_chuchai: function (ev) {
            ev.preventDefault();

        },
        /**
         * @memberOf Report_detail_screen
         * @description 添加出差明细
         * @param {object} ev dom对象
         */
        add_chuchai: function (ev) {
            ev.preventDefault();
            var self = this;
            self.load_chuchai();
            $.popup('.popup-chuchai');

        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端加载出差明细数据
         * @param {object} parent 父对象
         */
        load_chuchai: function (parent) {
            var self = this;
            var old_chuchai_ids = [];
            // if (self.chuchai_ids) {
            //     $.each(self.chuchai_ids, function (key, value) {
            //         old_chuchai_ids.push(parseInt(value.id));
            //     });
            // }

            $.each(self.$('.o_report_chuchai_id'), function (key, value) {
                var id = parseInt($(value).data('id'));
                if (id) {
                    if (!$(value).is(":hidden")) {
                        old_chuchai_ids.push(id)
                    }
                }
            });

            var condition = [];
            var value = $('.o_search_chuchai').val()
            if (value) {
                condition.push('|', '|', ['startaddress', 'ilike', value], ['endaddress', 'ilike', value], ['reason', 'ilike', value]);
            }
            condition.push(['create_uid', '=', self.uid], ['id', 'not in', old_chuchai_ids]);
            //if(old_chuchai_ids.length>0) condition.push(['id', 'not in ', old_chuchai_ids]);

            var def = new $.Deferred();
            new Model('dtdream.travel.journey')
                .query(['id', 'endtime', 'startaddress', 'endaddress', 'reason'])
                .filter(condition)
                .all({'timeout': 3000, 'shadow': true})
                .then(function (chuchai_ids) {
                        self.search_chuchai_ids = chuchai_ids;
                        if (self.render_chuchai(chuchai_ids, self.$('.o_report_chuchai'))) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示出差明细界面
         * @param {json} chuchai_ids 出差明细
         * @param {object} $el dom对象
         */
        render_chuchai: function (chuchai_ids, $el) {
            var $chuchai_ids = $(QWeb.render('search_chuchai_list', {'chuchai_ids': chuchai_ids}));
            $el.prepend($chuchai_ids);
        },
        /**
         * @memberOf Report_detail_screen
         * @description 搜索消费明细
         * @param {object} ev dom对象
         */
        search_expense_record: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_report_expense').empty();

                this.load_expense_record(this);
            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 选择驳回节点
         * @param {object} e dom对象
         */
        select_reject_state: function (e) {
            var self = this;
            var value = self.expense_report.state;
            var state = self.$('.o_reject_state')
            var sqr = {
                text: '申请人',
                bold: true,
                color: 'danger',
                onClick: function () {
                    state.data('id', 'draft');
                    state.val('申请人');
                    $.popup('.popup-reject')
                }
            }

            var xzzl = {
                text: '行政助理',
                bold: true,
                color: 'danger',
                onClick: function () {
                    state.data('id', 'xingzheng');
                    state.val('行政助理');
                }
            }

            var zg = {
                text: '行政助理',
                bold: true,
                color: 'danger',
                onClick: function () {
                    state.data('id', 'zhuguan');
                    state.val('主管');
                }
            }

            var qqr = {
                text: '行政助理',
                bold: true,
                color: 'danger',
                onClick: function () {
                    state.data('id', 'quanqianren');
                    state.val('权签人');
                }
            }

            var items = [{
                text: '请选择',
                label: true
            },];
            if (value == "xingzheng") {
                items.push(sqr);
            }
            if (value == "zhuguan") {
                items.push(sqr, xzzl);
            }
            if (value == "quanqianren") {
                items.push(sqr, xzzl, zg);
            }

            if (value == "jiekoukuaiji") {
                items.push(sqr, xzzl, zg, qqr);
            }

            var buttons1 = items;
            var buttons2 = [
                {
                    text: '取消',
                    bg: 'danger'
                }
            ];
            var groups = [buttons1, buttons2];
            $.actions(groups);
        },
        /**
         * @memberOf Report_detail_screen
         * @description 编辑费用分摊比例
         * @param ｛object} e dom对象
         * @returns {boolean}
         */
        edit_benefitdep: function (e) {
            e.preventDefault();

            if (this.options.expense_report.state != 'draft') return false;

            var self = this;
            var id = $(e.currentTarget).data('id');
            var name = $(e.currentTarget).data('name');
            var sharepercent = $(e.currentTarget).data('sharepercent');
            var dep_name = $(e.currentTarget).find('.item-title').html();

            self.$('.o_benefitdep_form').data('id', id);
            self.$('.o_benefitdep_form').data('edit-type', "edit");
            self.$('input[data-name=dep_name]').val(dep_name);
            self.$('input[data-name=dep_name]').data('id', name);
            self.$('input[data-id=sharepercent]').val(sharepercent);

            $.popup('.popup-benefitdep');

        },
        /**
         * @memberOf Report_detail_screen
         * @description 删除消费明细
         * @param {object} e dom对象
         */
        delete_report_expense: function (e) {
            e.preventDefault();
            var li = e.currentTarget.parentNode.parentNode;
            if ($(li).data('id')) {
                $(li).hide();
            } else {
                $(li).detach();
            }

            e.stopPropagation();
        },
        /**
         * @memberOf Report_detail_screen
         * @description 删除费用分摊比例
         * @param {object} e dom对象
         */
        delete_benefitdep: function (e) {
            e.preventDefault();
            var li = e.currentTarget.parentNode;
            if ($(li).data('id') > 0) {
                $(li).hide();
            } else {
                $(li).detach();
            }

            e.stopPropagation();
        },
        /**
         * @memberOf Report_detail_screen
         * @description 选择部门
         * @param {object} e dom对象
         */
        select_dep: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this;
            var id = $(e.currentTarget).data('id');
            if (self.departments) {
                $.each(self.departments, function (key, value) {
                    if (value.id == id) {
                        $('input[data-name=dep_name]').val(value.name);
                        $('input[data-name=dep_name]').data('id', value.id);
                    }
                });
            }

            self.$('.o_report_department').empty();
            $.popup('.popup-benefitdep');
        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端获取部门列表
         * @param {object} e dom对象
         */
        get_dep: function (e) {

            var self = this;
            var def = $.Deferred();
            var old_dep_ids = [];
            // if (self.benefitdep_records) {
            //     $.each(self.benefitdep_records, function (key, value) {
            //         old_dep_ids.push(value.name[0])
            //     })
            // }

            $.each(self.$('.o_benefitdep_list'), function (key, value) {
                var name = $(value).data('name');
                if (!$(value).is(":hidden")) {
                    old_dep_ids.push(name);
                }
            });

            var condition = [['id', 'not in', old_dep_ids]];
            var value = $('.o_search_department').val()
            if (value) {
                condition.push(['name', 'ilike', value]);
            }

            new Model('hr.department').query(['id', 'name',])
                .filter(condition)
                .all({'timeout': 3000, 'shadow': true})
                .then(function (depatments) {
                    self.departments = depatments;
                    if (self.render_dep(depatments, self.$('.o_report_department'))) {
                        def.resolve();
                    } else {
                        def.reject();
                    }
                }, function (err, event) {
                    event.preventDefault();
                    def.reject();
                });

            $.popup('.popup-department');

            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: true,//是否控制点击事件，true 控制，false 不控制， 默认false
                text: '取消',//控制显示文本，空字符串表示显示默认文本
                onSuccess: function (result) {

                    self.$('.o_report_department').empty();
                    $.popup('.popup-benefitdep');
                    dd.biz.navigation.setRight({
                        show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                        control: false,
                    });
                },
                onFail: function (err) {
                }
            });

        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示部门列表
         * @param {json} departments 部门列表
         * @param {object} $el dom 对象
         */
        render_dep: function (departments, $el) {
            var $departments = $(QWeb.render('dep', {'departments': departments}));
            $el.prepend($departments);

        },
        /**
         * @memberOf Report_detail_screen
         * @description 添加费用分摊比例
         * @param {object} ev dom对象
         */
        add_benefitdep: function (ev) {
            ev.preventDefault();
            $.popup('.popup-benefitdep');
            self.$('.o_benefitdep_form').data('edit-type', "create");
            self.$('input[data-name=dep_name]').val("");
            self.$('input[data-id=sharepercent]').val("");

        },
        /**
         * @memberOf Report_detail_screen
         * @description 添加消费明细
         * @param {object} ev dom对象
         */
        add_expense: function (ev) {
            ev.preventDefault();
            var self = this;
            self.load_expense_record();
            $.popup('.popup-expense');

        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端获取消费明细列表
         */
        load_expense_record: function () {
            var self = this;
            var old_expense_ids = [];
            // if (self.expense_records) {
            //     $.each(self.expense_records, function (key, value) {
            //         old_expense_ids.push(value.id);
            //     });
            // }

            $.each(self.$('.o_report_expense_record'), function (key, value) {
                var id = parseInt($(value).data('id'));
                if (id) {
                    if (!$(value).is(":hidden")) {
                        old_expense_ids.push(id)
                    }
                }
            });

            var condition = [];
            var value = $('.o_search_expense_record').val()
            if (value) {
                condition.push('|', ['expensecatelog', 'ilike', value], ['expensedetail', 'ilike', value]);
            }

            condition.push(['create_uid', '=', this.uid], ['report_ids', '=', false], ['id', 'not in', old_expense_ids]);

            var def = new $.Deferred();
            new Model('dtdream.expense.record')
                .query(['id', 'name', 'expensecatelog', 'expensedetail', 'invoicevalue', 'city', 'province', 'currentdate', 'write_date'])
                .filter(condition)
                .all({'timeout': 3000, 'shadow': true})
                .then(function (expense_records) {
                        self.search_expense_records = expense_records;
                        if (self.render_expense_records(expense_records, self.$('.o_report_expense'))) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );

        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示消费明细
         * @param {json} expense_records 消费明细
         * @param {object} $el dom对象
         */
        render_expense_records: function (expense_records, $el) {
            var $expense_records = $(QWeb.render('search_expense_list', {'expense_records': expense_records}));
            $el.prepend($expense_records);
            // $users.appendTo('.o_expense');
        },
        /**
         * @memberOf Report_detail_screen
         * @description 工具栏列表事件
         * @property {string} sumbit_benefitdep 保存费用分摊比例
         * @property {string} cancel_add_benefitdep 取消保存费用分摊比例
         * @property {string} cancel_add_chuchai 取消保存费用分摊比例
         * @property {string} add_chuchai 保存出差明细
         * @property {string} cancel_add_expense 取消保存出差明细
         * @property {string} add_expense 保存出差明细
         * @property {string} cancel 取消保存报销申请,返回报销申请界面
         * @property {string} save 保存报销申请,返回报销申请界面
         * @property {string} delete 报销爆笑申请,返回报销申请界面
         * @property {string} qianshou 签收文件后，返回报销申请界面
         * @property {string} confirm_pay 付款后，返回报销申请界面
         * @property {string} accept 同意审批,返回报销申请界面
         * @property {string} reject 打开拒绝审批界面
         * @property {string} cancel_reject 取消拒绝审批
         * @property {string} sumbit_reject 确认拒绝审批
         * @param {object} parent 父对象
         */
        action_button: function (parent) {
            parent.preventDefault();
            var self = this;
            if ($(parent.currentTarget).data('item-id') == 'sumbit_benefitdep') {
                var edit_type = self.$('.o_benefitdep_form').data('edit-type')

                if (!self.$('input[data-name=dep_name]').data('id')) {
                    dd.device.notification.alert({
                        message: "请选择部门",
                        title: "提示",//可传空
                        buttonName: "确定",
                        onSuccess: function () {
                            //onSuccess将在点击button之后回调
                            /*回调*/
                        },
                        onFail: function (err) {
                        }
                    });
                    return;
                }

                var percent = self.$('input[data-id=sharepercent]').val();
                if (!$.isNumeric(percent)) {

                    dd.device.notification.alert({
                        message: "分配比例必须为数字",
                        title: "提示",//可传空
                        buttonName: "确定",
                        onSuccess: function () {
                            //onSuccess将在点击button之后回调
                            /*回调*/
                        },
                        onFail: function (err) {
                        }
                    });
                    return;
                }
                if (percent <= 0 || percent > 100) {
                    dd.device.notification.alert({
                        message: "分配比例必须在0和100之间",
                        title: "提示",//可传空
                        buttonName: "确定",
                        onSuccess: function () {
                            //onSuccess将在点击button之后回调
                            /*回调*/
                        },
                        onFail: function (err) {
                        }
                    });
                    return;
                }

                if (edit_type == 'edit') {
                    var id = self.$('.o_benefitdep_form').data('id');
                    var benefit = $('.o_benefitdep_list[data-id=' + id + ']');
                    benefit.attr('data-name', self.$('input[data-name=dep_name]').data('id'));
                    benefit.attr('data-sharepercent', self.$('input[data-id=sharepercent]').val());

                    benefit.find('.item-title').html(self.$('input[data-name=dep_name]').val());
                    benefit.find('.pull-center').html(self.$('input[data-id=sharepercent]').val() + "%");
                }
                if (edit_type == 'create') {


                    var dep_id = self.$('input[data-name=dep_name]').data('id');
                    var dep_name = self.$('input[data-name=dep_name]').val();
                    var sharepercent = self.$('input[data-id=sharepercent]').val();
                    var benefitdeps = [{
                        id: -new Date().getTime(),
                        name: [dep_id, dep_name],
                        sharepercent: sharepercent
                    }]
                    self.rend_benefitdep_detail(benefitdeps, self.$el);
                }

                self.$('input[data-name=dep_name]').val("");
                self.$('input[data-name=dep_name]').data('id', "");
                self.$('input[data-id=sharepercent]').val("");

                $.closeModal();
                self.$('.o_report_benefitdep').empty();
            }

            if ($(parent.currentTarget).data('item-id') == 'cancel_add_benefitdep') {
                $.closeModal();
                self.$('.o_report_benefitdep').empty();
            }

            if ($(parent.currentTarget).data('item-id') == 'cancel_add_chuchai') {
                $.closeModal();
                self.$('.o_report_chuchai').empty();
            }

            if ($(parent.currentTarget).data('item-id') == 'add_chuchai') {
                var selected_chuchai = [];
                $.each(this.$('input[name=ck_report_chuchai]'), function (key, value) {
                    if (value.checked) {
                        if (self.search_chuchai_ids) {
                            $.each(self.search_chuchai_ids, function (key_expense, value_chuchai) {
                                if (value_chuchai.id == $(value).data('id')) {
                                    selected_chuchai.push(value_chuchai);
                                    self.chuchai_ids.push(value_chuchai);
                                }
                            })
                        }
                    }
                });

                if (selected_chuchai.length > 0) {
                    self.rend_chuchai_detail(selected_chuchai, self.$el);
                    $.closeModal();
                    self.$('.o_report_chuchai').empty();
                } else {
                    $.toast('没有选择费用明细')
                }


            }


            if ($(parent.currentTarget).data('item-id') == 'cancel_add_expense') {
                $.closeModal();
                self.$('.o_report_expense').empty();
            }

            if ($(parent.currentTarget).data('item-id') == 'add_expense') {
                var selected_expens = [];
                $.each(this.$('input[name=ck_report_expense]'), function (key, value) {
                    if (value.checked) {
                        if (self.search_expense_records) {
                            $.each(self.search_expense_records, function (key_expense, value_expense) {
                                if (value_expense.id == $(value).data('id')) {
                                    selected_expens.push(value_expense);
                                    self.expense_records.push(value_expense);
                                }
                            })
                        }
                    }
                });

                if (selected_expens.length > 0) {
                    self.rend_expense_detail(selected_expens, self.$el);
                    $.closeModal();
                    self.$('.o_report_expense').empty();
                } else {
                    $.toast('没有选择费用明细')
                }


            }

            if ($(parent.currentTarget).data('item-id') == 'cancel') {

                if (self.options && self.options.is_workflow) {
                    core.bus.trigger('change_screen', {
                        id: 'workflow',
                    });
                } else if (self.options && self.options.is_have_check) {
                    core.bus.trigger('change_screen', {
                        id: 'have_check',
                    });
                } else if (self.options && self.options.is_outtime) {
                    core.bus.trigger('change_screen', {
                        id: 'outtime',
                    });
                }
                else {

                    core.bus.trigger('change_screen', {
                        id: 'report',
                    });
                }
            }
            if ($(parent.currentTarget).data('item-id') == 'save') {
                var xingzhengzhuli_id = this.$('input[data-id=xingzhengzhuli]').data('xingzhengzhuli-id');
                if (!xingzhengzhuli_id) {
                    $.alert('请选择行政助理');
                    return;
                }

                var chuchai_ids = [];
                $.each(self.$('.o_report_chuchai_id'), function (key, value) {
                    var id = parseInt($(value).data('id'));
                    if (id) {
                        if ($(value).is(":hidden")) {
                            chuchai_ids.push([3, id]);
                        } else {
                            chuchai_ids.push([4, id]);
                        }
                    }
                });

                var expense_ids = [];
                $.each(self.$('.o_report_expense_record'), function (key, value) {
                    var id = parseInt($(value).data('id'));
                    if (id) {
                        if ($(value).is(":hidden")) {
                            expense_ids.push([3, id]);
                        } else {
                            expense_ids.push([4, id]);
                        }
                    }
                });

                var benefitdep_ids = [];
                var sum_shaerpercent = 0;
                $.each(self.$('.o_benefitdep_list'), function (key, value) {

                    var id = parseInt($(value).data('id'));
                    var name = $(value).data('name');
                    var sharepercent = $(value).data('sharepercent');

                    if (id > 0) {
                        if ($(value).is(":hidden")) {
                            benefitdep_ids.push([2, id]);
                        } else {
                            benefitdep_ids.push([1, id, {
                                name: name,
                                sharepercent: sharepercent,
                            }]);
                            sum_shaerpercent += parseFloat(sharepercent);
                        }
                    } else {
                        benefitdep_ids.push([0, 0, {
                            name: name,
                            sharepercent: sharepercent,
                        }])
                        sum_shaerpercent += parseFloat(sharepercent);
                    }
                });

                if (sum_shaerpercent != 100) {
                    $.alert('部门分摊比例不等于100%');
                    return;
                }

                var expense_report_detail = {
                    'paytype': this.$('input[data-id=paytype]').data('paytype-id'),
                    'paycatelog': this.$('input[data-id=paycatelog]').data('paycatelog-id'),
                    'shoukuanrenxinming': this.$('input[data-id=shoukuanrenxinming]').val(),
                    'xingzhengzhuli': this.$('input[data-id=xingzhengzhuli]').data('xingzhengzhuli-id'),
                    'kaihuhang': this.$('input[data-id=kaihuhang]').val(),
                    'yinhangkahao': this.$('input[data-id=yinhangkahao]').val(),
                    'expensereason': this.$('textarea[data-id=expensereason]').val(),
                    'benefitdep_ids': benefitdep_ids,
                    'record_ids': expense_ids,
                    'chuchaishijian_ids': chuchai_ids,
                }
                var def = new $.Deferred();
                parent.expense_report = self.expense_report;
                new Model('dtdream.expense.report').call('read', [[self.expense_report.id], ['id', 'write_date']]).then(function (records) {
                    if (records) {
                        if (records[0].write_date == parent.expense_report.write_date) {
                            $.when(new Model('dtdream.expense.report').call('write', [[self.expense_report.id], expense_report_detail])).then(function () {
                                $.toast("保存成功");
                                core.bus.trigger('change_screen', {
                                    id: 'report',
                                });

                            });
                        }
                        else {
                            $.toast('数据已经被修改,请刷新数据。');
                            core.bus.trigger('change_screen', {
                                id: 'report',
                            });
                        }
                    } else {
                        $.toast('没有找到对应的纪录。');
                        core.bus.trigger('change_screen', {
                            id: 'report',
                        });
                    }
                });
                def.resolve();
            }
            if ($(parent.currentTarget).data('item-id') == 'delete') {
                var def = new $.Deferred();
                parent.expense_report = self.expense_report;
                new Model('dtdream.expense.report').call('read', [[self.expense_report.id], ['id', 'write_date', 'report_ids']]).then(function (records) {
                    if (records) {
                        if (records[0].write_date == parent.expense_report.write_date) {
                            $.confirm('您确定要删除此条记录吗?',
                                function () {
                                    $.when(new Model('dtdream.expense.report').call('unlink', [[self.expense_report.id]])).then(function () {
                                        $.toast("删除成功");
                                        core.bus.trigger('change_screen', {
                                            id: 'report',
                                        });

                                    });
                                },
                                function () {

                                }
                            );

                        } else {
                            $.toast('数据已经被修改,请刷新数据。');
                            core.bus.trigger('change_screen', {
                                id: 'report',
                            });
                        }
                    } else {
                        $.toast('没有找到对应的纪录,删除失败。');
                        core.bus.trigger('report', {
                            id: 'expense',
                        });
                    }
                    def.resolve();
                });
            }

            if ($(parent.currentTarget).data('item-id') == 'qianshou') {
                var id = parseInt(self.expense_report.id);
                new Model('dtdream.expense.report').call('btn_checkpaper', [[id]]).then(function (result) {
                    console.log(result);
                    $.toast("签收成功");
                    core.bus.trigger('change_screen', {
                        id: 'workflow',
                    });
                }, function (err) {
                    console.log(err);
                    $.alert(err.data.message);
                });
            }

            if ($(parent.currentTarget).data('item-id') == 'confirm_pay') {
                $.confirm('确定已付款吗??', function () {
                    var id = parseInt(self.expense_report.id);
                    new Model('dtdream.expense.report').exec_workflow(id, 'btn_confirmmoney').then(function (result) {
                        console.log(result);
                        $.toast("付款成功");
                        core.bus.trigger('change_screen', {
                            id: 'workflow',
                        });
                    }, function (err) {
                        console.log(err);
                        $.alert(err.data.message);
                    });
                });
            }

            if ($(parent.currentTarget).data('item-id') == 'accept') {
                var text = QWeb.render('report_accept');
                parent.report_id = parseInt(self.expense_report.id);
                var modal = $.modal({
                    title: '同意?',
                    afterText: text,
                    buttons: [
                        {
                            text: '取消'
                        },
                        {
                            text: '确定',
                            bold: true,
                            onClick: function (ev) {
                                var accept_text = ev.find('.o_accept').val();
                                if (accept_text.length == 0) {
                                    $.alert('没有输入意见;')
                                } else {
                                    new Model('dtdream.expense.agree.wizard').call('create', [{advice: accept_text}]).then(function (result) {
                                        console.log(result);

                                        var context = [[result], {
                                            'lang': 'zh_CN',
                                            'uid': 1,
                                            'active_model': 'dtdream.expense.report',
                                            'search_disable_custom_filters': true,
                                            'active_ids': [parent.report_id],
                                            'active_id': parent.report_id
                                        }]

                                        new Model('dtdream.expense.agree.wizard').call_button('btn_confirm', context).then(function (result) {
                                            $.toast("审批完成");
                                            core.bus.trigger('change_screen', {
                                                id: 'workflow',
                                            });
                                        }, function (err) {
                                            $.alert(err.data.message);
                                        });
                                    }, function (err) {
                                    });

                                }

                            }
                        },
                    ]
                })
            }

            if ($(parent.currentTarget).data('item-id') == 'reject') {
                $.popup('.popup-reject');
            }

            if ($(parent.currentTarget).data('item-id') == 'cancel_reject') {
                $.closeModal();
            }

            if ($(parent.currentTarget).data('item-id') == 'sumbit_reject') {
                var accept_text = self.$('.o_reject_advice').val();
                var state = self.$('.o_reject_state').data('id');
                if (accept_text.length == 0) {
                    $.alert('没有输入意见;')
                } else if (state.length == 0) {
                    $.alert('没有选择节点');
                }
                else {
                    var report_context = {
                        'active_ids': [self.expense_report.id],
                        'active_id': self.expense_report.id,
                        'active_model': 'dtdream.expense.report'
                    }
                    new Model('dtdream.expense.wizard').call('create', [{
                        liyou: accept_text,
                        state: state
                    }], {context: report_context}).then(function (result) {
                        console.log(result);

                        var context = [[result], {
                            'lang': 'zh_CN',
                            'uid': 1,
                            'active_model': 'dtdream.expense.report',
                            'search_disable_custom_filters': true,
                            'active_ids': [self.expense_report.id],
                            'active_id': self.expense_report.id
                        }]
                        new Model('dtdream.expense.wizard').call_button('btn_confirm', context).then(function (result) {
                            $.toast("审批完成");
                            core.bus.trigger('change_screen', {
                                id: 'workflow',
                            });
                        }, function (err) {
                            $.alert(err.data.message);
                        });
                    }, function (err) {
                    });

                }

            }

        },
        /**
         * @memberOf Report_detail_screen
         * @description 打开支付方式界面
         * @param {object} ev dom对象
         */
        action_paytype: function (ev) {
            ev.preventDefault();
            var self = this;
            if (self.options.expense_report.state != 'draft')return;
            var buttons1 = [
                {
                    text: '请选择',
                    label: true
                },
                {
                    text: '银行转账',
                    bold: true,
                    color: 'danger',
                    onClick: function (e) {
                        $('input[data-id=paytype]').data('paytype-id', 'yinhangzhuanzhang');
                        $('input[data-id=paytype]').val('银行转账');
                    }
                },
                {
                    text: '核销备用金',
                    onClick: function (e) {
                        $('input[data-id=paytype]').data('paytype-id', 'hexiaobeiyongjin');
                        $('input[data-id=paytype]').val('核销备用金');
                    }
                }
            ];
            var buttons2 = [
                {
                    text: '取消',
                    bg: 'danger'
                }
            ];
            var groups = [buttons1, buttons2];
            $.actions(groups);
        },
        /**
         * @memberOf Report_detail_screen
         * @description 选择支付类别
         */
        action_paycatelog: function (ev) {
            ev.preventDefault();
            var self = this;
            if (self.options.expense_report.state != 'draft')return;
            var buttons1 = [
                {
                    text: '请选择',
                    label: true
                },
                {
                    text: '付款给员工',
                    bold: true,
                    color: 'danger',
                    onClick: function (e) {
                        $('input[data-id=paytype]').data('paytype-id', 'fukuangeiyuangong');
                        $('input[data-id=paytype]').val('付款给员工');
                    }
                },
                {
                    text: '付款给供应商',
                    onClick: function (e) {
                        $('input[data-id=paytype]').data('paytype-id', 'fukuangeigongyingshang');
                        $('input[data-id=paytype]').val('付款给供应商');
                    }
                }
            ];
            var buttons2 = [
                {
                    text: '取消',
                    bg: 'danger'
                }
            ];
            var groups = [buttons1, buttons2];
            $.actions(groups);
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示爆笑申请详细内容
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            $('.o_main_bar').hide();
            console.log(el);
            this._super(el, options);
            this.options = options;
            if (options && options.expense_report) {
                this.expense_report = options.expense_report;
                this.$('input[data-id=name]').val(this.expense_report.name);
                this.$('input[data-id=paytype]').data('paytype-id', this.expense_report.paytype);
                var payType = {'yinhangzhuanzhang': '银行转账', 'hexiaobeiyongjin': '核销备用金'};
                this.$('input[data-id=paytype]').val(payType[this.expense_report.paytype]);
                this.$('input[data-id=paycatelog]').data('paycatelog-id', this.expense_report.paycatelog);
                var paycatelog = {'fukuangeiyuangong': '付款给员工', 'fukuangeigongyingshang': '付款给供应商'};
                this.$('input[data-id=paycatelog]').val(paycatelog[this.expense_report.paycatelog]);
                this.$('input[data-id=shoukuanrenxinming]').val(this.expense_report.shoukuanrenxinming);
                this.$('input[data-id=kaihuhang]').val(this.expense_report.kaihuhang);
                this.$('input[data-id=yinhangkahao]').val(this.expense_report.yinhangkahao);

                this.$('input[data-id=xingzhengzhuli]').val(this.expense_report.xingzhengzhuli[1]);
                this.$('input[data-id=xingzhengzhuli]').data('xingzhengzhuli-id', this.expense_report.xingzhengzhuli[0]);

                if (this.expense_report.currentauditperson) {
                    this.$('input[data-id=currentauditperson]').val(this.expense_report.currentauditperson[1]);
                    this.$('.o_currentauditperson').show();
                } else {
                    this.$('.o_currentauditperson').hide();
                }
                if (this.expense_report.expensereason) {
                    this.$('textarea[data-id=expensereason]').val(this.expense_report.expensereason);
                } else {
                    this.$('textarea[data-id=expensereason]').val("");
                }


                this.rend_expense(this);
                this.rend_benefitdep(this);
                this.rend_chuchai(this);

                if (options.is_workflow) {
                    if (this.expense_report.state == 'daifukuan') {
                        this.$('a[data-item-id=accept]').hide();
                        this.$('a[data-item-id=reject]').hide();
                        this.$('a[data-item-id=qianshou]').hide();
                    } else {
                        this.$('a[data-item-id=confirm_pay]').hide();
                    }
                    this.$('a[data-item-id=save]').hide();
                    this.$('a[data-item-id=delete]').hide();

                    this.$('.o_add_expense').hide();
                    this.$('.o_add_benefitdep').hide();
                    this.$('.o_add_chuchai').hide();

                    this.$('input[data-id=shoukuanrenxinming]').attr("readonly", "readonly");
                    this.$('input[data-id=kaihuhang]').attr("readonly", "readonly");
                    this.$('input[data-id=yinhangkahao]').attr("readonly", "readonly");
                    this.$('textarea[data-id=expensereason]').attr("readonly", "readonly");

                    // this.$('.o_delete_report_expense').hide();
                    // this.$('.o_delete_benefitdep').hide();

                } else if (options.is_have_check) {
                    this.$('a[data-item-id=accept]').hide();
                    this.$('a[data-item-id=reject]').hide();
                    this.$('a[data-item-id=qianshou]').hide();
                    this.$('a[data-item-id=confirm_pay]').hide();


                    this.$('a[data-item-id=save]').hide();
                    this.$('a[data-item-id=delete]').hide();

                    this.$('.o_add_expense').hide();
                    this.$('.o_add_benefitdep').hide();
                    this.$('.o_add_chuchai').hide();

                    this.$('input[data-id=shoukuanrenxinming]').attr("readonly", "readonly");
                    this.$('input[data-id=kaihuhang]').attr("readonly", "readonly");
                    this.$('input[data-id=yinhangkahao]').attr("readonly", "readonly");
                    this.$('textarea[data-id=expensereason]').attr("readonly", "readonly");

                } else if (options.expense_report.state != 'draft') {
                    this.$('a[data-item-id=save]').hide();
                    this.$('a[data-item-id=delete]').hide();
                    this.$('a[data-item-id=accept]').hide();
                    this.$('a[data-item-id=reject]').hide();
                    this.$('a[data-item-id=qianshou]').hide();
                    this.$('a[data-item-id=confirm_pay]').hide();

                    this.$('.o_add_expense').hide();
                    this.$('.o_add_benefitdep').hide();
                    this.$('.o_add_chuchai').hide();

                    this.$('input[data-id=shoukuanrenxinming]').attr("readonly", "readonly");
                    this.$('input[data-id=kaihuhang]').attr("readonly", "readonly");
                    this.$('input[data-id=yinhangkahao]').attr("readonly", "readonly");
                    this.$('textarea[data-id=expensereason]').attr("readonly", "readonly");

                    // this.$('.o_delete_report_expense').hide();
                    // this.$('.o_delete_benefitdep').hide();
                } else {
                    this.$('a[data-item-id=accept]').hide();
                    this.$('a[data-item-id=reject]').hide();
                    this.$('a[data-item-id=confirm_pay]').hide();
                    this.$('a[data-item-id=qianshou]').hide();

                }
            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示出差明细
         * @param {object} parent 父对象
         */
        rend_chuchai: function (parent) {
            var def = new $.Deferred();
            var self = this;
            new Model('dtdream.travel.journey')
                .query(['id', 'endtime', 'startaddress', 'endaddress', 'reason'])
                .filter([['report_ids', '=', this.expense_report.id]])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (chuchai_ids) {
                        self.chuchai_ids = chuchai_ids;
                        if (parent.rend_chuchai_detail(chuchai_ids, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端获取消费明细
         * @param {object} parent 父对象
         */
        rend_expense: function (parent) {
            var def = new $.Deferred();
            var self = this;
            new Model('dtdream.expense.record')
                .query(['id', 'name', 'expensecatelog', 'expensedetail', 'invoicevalue', 'city', 'province', 'currentdate', 'write_date', 'state'])
                .filter([['report_ids', '=', this.expense_report.id]])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (expense_records) {
                        self.expense_records = expense_records;
                        if (parent.rend_expense_detail(expense_records, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示消费明细
         * @param {json} expense_records 消费明细
         * @param {object} $el dom对象
         */
        rend_expense_detail: function (expense_records, $el) {
            if (expense_records) {
                var $expense_records = $(QWeb.render('report_expense_list', {
                    'expense_records': expense_records,
                    'state': this.options.expense_report.state
                }));
                $el.find('.o_report_expense_ids').append($expense_records);

            }


        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示出差明细
         * @param {json} chuchai_ids 出差明细
         * @param {object} $el dom对象
         */
        rend_chuchai_detail: function (chuchai_ids, $el) {
            if (chuchai_ids) {
                var $chuchai_ids = $(QWeb.render('report_chuchai_list', {
                    'chuchai_ids': chuchai_ids,
                    'state': this.options.expense_report.state
                }));
                $el.find('.o_report_chuchai_ids').append($chuchai_ids);

            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 从服务端获取费用分摊明细
         * @param {object} parent 父对象
         */
        rend_benefitdep: function (parent) {
            var def = new $.Deferred();
            var self = this;
            new Model('dtdream.expense.benefitdep')
                .query(['id', 'name', 'sharepercent', 'write_date'])
                .filter([['report_id', '=', this.expense_report.id]])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (benefitdep_records) {
                        self.benefitdep_records = benefitdep_records;
                        if (parent.rend_benefitdep_detail(benefitdep_records, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示费用分摊明细
         * @param {json} benefitdep_records 费用分摊明细
         * @param {object} $el dom对象
         */
        rend_benefitdep_detail: function (benefitdep_records, $el) {
            if (benefitdep_records) {
                var $benefitdep_records = $(QWeb.render('benefitdep_list', {
                    'benefitdep_records': benefitdep_records,
                    'state': this.options.expense_report.state
                }));
                $el.find('.o_report_benefitdep_ids').append($benefitdep_records);

            }
        },
        /**
         * @memberOf Report_detail_screen
         * @description 显示钉钉界面抬头内容
         */
        setTitle: function () {
            if (this.options) {
                if (this.options.detail_title) {
                    this.title = this.options.detail_title;
                } else if (this.options.expense_report && this.options.expense_report.state == 'draft') {
                    this.title = '待提交的报销申请';
                } else {
                    this.title = '未完成的报销申请';
                }
            }
            this._super();
        },
    })

    /**
     * @class Workflow_screen
     * @augments Report_screen
     * @description 待我审批的爆笑申请界面
     */
    var Workflow_screen = Report_screen.extend({
        /**
         * @memberOf Workflow_screen
         * @description 显示待我审批的报销申请
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            var self = this;
            if (!options['condition']) {
                options['condition'] = [['currentauditperson_userid', '=', self.uid]];
            }
            this._super(el, options);

            this.load_data(this);
        },
        /**
         *  @memberOf Workflow_screen
         *  @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            if (!this.title) this.title = "待我审批的报销申请";
            this._super();
        },
        /**
         *  @memberOf Workflow_screen
         *  @description 显示报销申请明细界面
         * @param {object} ev dom对象
         */
        edit_expense_report: function (ev) {
            var expense_report_id = $(ev.currentTarget).data('id');
            $.each(this.expense_reports, function (key, value) {
                if (value.id == expense_report_id) {
                    core.bus.trigger('change_screen', {
                        id: 'report_detail',
                        options: {
                            'expense_report': value,
                            'is_workflow': true,
                            'detail_title': '待我审批的报销申请'
                        }
                    });
                }
            })
        },
        /**
         *  @memberOf Workflow_screen
         *  @description 显示待我审批的报销申请列表
         * @param {json} expense_reports 报销申请
         * @param {object} $el dom对象
         * @returns {*}
         */
        render_data: function (expense_reports, $el) {
            var self = this;
            var result = self._super(expense_reports, $el);
            $el.find('.o_report_cuiban').remove();
            return result;
        },
        // action_button: function (parent) {
        //     parent.preventDefault();
        //     var self = this;
        //     if ($(parent.currentTarget).data('item-id') == 'accept') {
        //         var text = $(QWeb.render('report_accept'));
        //         var modal = $.modal({
        //             title: '同意?',
        //             text: text,
        //             buttons: [
        //                 {
        //                     text: '取消'
        //                 },
        //                 {
        //                     text: '确定!',
        //                     bold: true,
        //                     onClick: function () {
        //                         $.alert('Thanks! I know you like it!')
        //                     }
        //                 },
        //             ]
        //         })
        //     }
        // }
    });

    /**
     * @class Havecheck_screen
     * @classdesc 我已审批的报销申请
     * @augments Workflow_screen
     */
    var Havecheck_screen = Workflow_screen.extend({
        /**
         * @memberOf Havecheck_screen
         * @description 显示我已审批的报销申请
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            var self = this;
            if (!options['condition']) {
                options['condition'] = [['hasauditor.user_id', '=', self.uid]];
            }
            this._super(el, options);
            this.load_data(this);
        },
        /**
         * @memberOf Havecheck_screen
         * @description 显示报销申请明细界面
         * @param {object} ev dom 对象
         */
        edit_expense_report: function (ev) {
            var expense_report_id = $(ev.currentTarget).data('id');
            $.each(this.expense_reports, function (key, value) {
                if (value.id == expense_report_id) {
                    core.bus.trigger('change_screen', {
                        id: 'report_detail',
                        options: {
                            'expense_report': value,
                            'is_workflow': false,
                            'is_have_check': true,
                            'detail_title': '我已审批的报销申请'
                        }
                    });
                }
            })
        },
        /**
         * @memberOf Havecheck_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "我已审批的报销申请"
            this._super();
        }
    });

    /**
     * @class Havepay_screen
     * @classdesc 已付款的报销申请
     * @augments Workflow_screen
     */
    var Havepay_screen = Workflow_screen.extend({
        attach: function (el, options) {
            var self = this;
            if (!options['condition']) {
                options['condition'] = [['create_uid', '=', self.uid], ['state', '=', 'yifukuan']];
            }
            this._super(el, options);
            this.load_data(this);
        },
        /**
         * @memberOf Havepay_screen
         * @description 显示已付款的报销申请的明细界面
         * @param {object} ev dom对象
         */
        edit_expense_report: function (ev) {
            var expense_report_id = $(ev.currentTarget).data('id');
            $.each(this.expense_reports, function (key, value) {
                if (value.id == expense_report_id) {
                    core.bus.trigger('change_screen', {
                        id: 'report_detail',
                        options: {
                            'expense_report': value,
                            'is_workflow': false,
                            'is_have_check': false,
                            'is_have_pay': true,
                            'detail_title': '已付款的报销申请'
                        }
                    });
                }
            })
        },
        /**
         * @memberOf Havepay_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "已付款的报销申请"
            this._super();
        }
    });

    /**
     * @class Outtime_screen
     * @classdesc 已超期的报销申请
     * @augments Workflow_screen
     */
    var Outtime_screen = Workflow_screen.extend({
        /**
         * @memberOf Outtime_screen
         * @description 显示已超期的报销申请的明细界面
         * @param {object} ev dom对象
         */
        edit_expense_report: function (ev) {
            var expense_report_id = $(ev.currentTarget).data('id');
            $.each(this.expense_reports, function (key, value) {
                if (value.id == expense_report_id) {
                    core.bus.trigger('change_screen', {
                        id: 'report_detail',
                        options: {
                            'expense_report': value,
                            'is_workflow': false,
                            'is_have_check': false,
                            'is_outtime': true,
                            'detail_title': '已超期的报销申请'
                        }
                    });
                }
            })
        },
        /**
         * @memberOf Outtime_screen
         * @description 显示已超期的报销申请列表
         * @param {object} el dom对象
         * @param {object} options 参数
         */
        attach: function (el, options) {
            var self = this;
            if (!options['condition']) {
                options['condition'] = [['is_outtime', '=', true], ['create_uid', '=', this.uid]];
            }
            this._super(el, options);
            this.load_data(this);
        },
        /**
         * @memberOf Outtime_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "已超期的报销申请"
            this._super();
        }
    });

    /**
     * @class Expense_category_screen
     * @classdesc 费用项目界面
     * @augments BasicScreenWidget
     */
    var Expense_category_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Expense_category_screen
         * @description 费用项目模板
         */
        template: 'expense_category',
        /**
         * @memberOf Expense_category_screen
         * @description 事件
         * @property {method} get_expense_detail 获取选择的费用项目
         * @property {method} query_expense_detail 搜索费用项目
         */
        events: {
            'click .item-content': 'get_expense_detail',
            'keyup .o_search_expense': 'query_expense_detail',
        },
        /**
         * @memberOf Expense_category_screen
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function (parent) {
            var self = this;
            self._super(parent);
            this.setTitle();
            this.condition = [];
            return this.load_data(this);
        },
        /**
         * @memberOf Expense_category_screen
         * @description 搜索费用项目
         * @param {object} ev dom对象
         */
        query_expense_detail: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_expense_category_list').detach();
                var search_value = ev.currentTarget.value;
                this.condition = ['|', ['name', 'ilike', search_value], ['parentid.name', 'ilike', search_value]];
                this.load_data(this);
            }
        },
        /**
         * @memberOf Expense_category_screen
         * @description 选择费用项目
         * @param {objcet} ev dom对象
         */
        get_expense_detail: function (ev) {
            ev.preventDefault();

            $('input[data-id="expensedetail"]').val($(ev.currentTarget).data('name'));
            $('input[data-id="expensedetail"]').data('expensecatelog-id', $(ev.currentTarget).data('expensecatelog-id'));
            $('input[data-id="expensedetail"]').data('expensedetail-id', $(ev.currentTarget).data('expensedetail-id'));
            this.detach();
            $.closeModal();
            $('.o_main_bar').hide();
            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: false,
            });

        },
        /**
         * @memberOf Expense_category_screen
         * @description 从服务端获取费用项目
         * @param {object} parent 父对象
         * @returns {jQuery.Deferred}
         */
        load_data: function (parent) {
            var def = new $.Deferred();
            new Model('dtdream.expense.detail')
                .query(['id', 'name', 'parentid'])
                .filter(this.condition)
                .order_by(['parentid'])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (details) {

                        if (parent.render_data(details, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }

                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
            return def;
        },
        /**
         * @memberOf Expense_category_screen
         * @description 显示费用项目
         * @param {json} details 费用项目
         * @param {object} $el dom对象
         */
        render_data: function (details, $el) {
            var catelogs = [];
            var last_value;
            $.each(details, function (key, value) {
                if (!last_value || value.parentid[0] != last_value.id) {
                    last_value = {
                        'id': value.parentid[0],
                        'name': value.parentid[1],
                        'detail_ids': [{
                            'id': value.id,
                            'name': value.name,
                        }]
                    }
                    catelogs.push(last_value)
                } else {
                    last_value.detail_ids.push({
                        'id': value.id,
                        'name': value.name,
                    })
                }

            });
            var $catelog = $(QWeb.render('expense_category_list', {'category_list': catelogs}));
            $el.find('.o_expense_category').prepend($catelog);
        },
        /**
         * @memberOf Expense_category_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "费用类别"
            this._super();
        }
    });

    /**
     * @class Province_city_screen
     * @classdesc 显示省份城市界面
     * @augments BasicScreenWidget
     */
    var Province_city_screen = BasicScreenWidget.extend({
        /**
         * @memberOf Province_city_screen
         * @description 省份城市模板
         */
        template: 'province_city',
        /**
         * @memberOf Province_city_screen
         * @description 事件
         * @property {method} get_province_city 选择省份城市
         * @property {method} query_province_city 查询省份城市
         */
        events: {
            'click .item-content': 'get_province_city',
            'keyup .o_search_province_city': 'query_province_city',
        },
        /**
         * @memberOf Province_city_screen
         * @description 查询省份城市
         * @param {object} ev dom对象
         */
        query_province_city: function (ev) {
            if (ev.keyCode == "13") {
                this.$('.o_content_province_city').empty();
                var search_value = ev.currentTarget.value;
                this.condition = ['|', ['name', 'ilike', search_value], ['provinceid.name', 'ilike', search_value]];
                this.load_data(this);
            }
        },
        /**
         * @memberOf Province_city_screen
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function (parent) {
            var self = this;
            self._super(parent);
            this.setTitle();
            this.condition = [];
            return this.load_data(this);
        },
        /**
         * @memberOf Province_city_screen
         * @description 选择省份城市
         * @param {object} ev dom对象
         */
        get_province_city: function (ev) {
            var province_city = $(ev.currentTarget).data('name');
            var province_id = $(ev.currentTarget).data('province-id');
            var city_id = $(ev.currentTarget).data('city-id');
            ev.preventDefault();

            $('input[data-id="province_city"]').val(province_city);
            $('input[data-id="province_city"]').data('province-id', province_id);
            $('input[data-id="province_city"]').data('city-id', city_id);

            this.detach();
            $.closeModal();
            $('.o_main_bar').hide();
            dd.biz.navigation.setRight({
                show: true,//控制按钮显示， true 显示， false 隐藏， 默认true
                control: false,
            });

        },
        load_data: function (parent) {
            var def = new $.Deferred();
            new Model('dtdream.expense.city')
                .query(['id', 'name', 'provinceid'])
                .filter(this.condition)
                .order_by(['provinceid'])
                .all({'timeout': 3000, 'shadow': true})
                .then(function (details) {

                        if (parent.render_data(details, parent.$el)) {
                            def.resolve();
                        } else {
                            def.reject();
                        }

                    }, function (err, event) {
                        event.preventDefault();
                        def.reject();
                    }
                );
            return def;
        },
        /**
         * @memberOf Province_city_screen
         * @description 从服务端获取省份城市
         * @param {json} details 省份城市
         * @param {object} $el dom对象
         */
        render_data: function (details, $el) {
            var catelogs = [];
            var last_value;
            $.each(details, function (key, value) {
                if (!last_value || value.provinceid[0] != last_value.id) {
                    last_value = {
                        'id': value.provinceid[0],
                        'name': value.provinceid[1],
                        'detail_ids': [{
                            'id': value.id,
                            'name': value.name,
                        }]
                    }
                    catelogs.push(last_value)
                } else {
                    last_value.detail_ids.push({
                        'id': value.id,
                        'name': value.name,
                    })
                }

            });
            var $catelog = $(QWeb.render('province_city_list', {'province_city_list': catelogs}));
            $el.find('.o_content_province_city').prepend($catelog);
        },
        /**
         * @memberOf Province_city_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "省份-城市"
            this._super();
        }
    });


    /**
     * @class My_screen
     * @classdesc 我的 界面
     * @augments BasicScreenWidget
     */
    var My_screen = BasicScreenWidget.extend({
        /**
         * @memberOf My_screen
         * @description 我的 界面模板
         */
        template: 'my_screen',
        /**
         * @memberOf My_screen
         * @description 事件
         * @property {method} get_my_report 跳转我的报销申请界面
         */
        events: {
            'click .o_my_report': 'get_my_report',
        },
        /**
         * @memberOf My_screen
         * @description 跳转报销申请列表界面
         * @param ev
         */
        get_my_report: function (ev) {
            ev.preventDefault();
            var id = $(ev.currentTarget).data('name');
            core.bus.trigger('change_screen', {
                id: id,
            });
        },
        /**
         * @memberOf My_screen
         * @description 在init方法后执行，具体参考widget.js
         * @param {object}parent 父对象传递回来的参数
         */
        start: function (parent) {
            var self = this;
            self._super(parent);
            this.setTitle();
            return this.load_data(this);
        },
        /**
         * @memberOf My_screen
         * @description 从服务端获取我的信息
         * @param {object} parent 父对象
         */
        load_data: function (parent) {
            var self = this;
            new Model('dtdream.expense.report.dashboard')
                .call('retrieve_sales_dashboard', []).then(function (result) {
                parent.rend_my_detail(result, parent.$el)
            });
        },
        /**
         * @memberOf My_screen
         * @description 显示我的信息
         * @param {json} my_detail 我的信息
         * @param {object} $el dom对象
         */
        rend_my_detail: function (my_detail, $el) {
            if (my_detail) {
                var $my_detail = $(QWeb.render('my_detail', {
                    'have_check_port': my_detail.have_check_report,
                    'override_report': my_detail.override_report,
                    'override_report_amount': my_detail.override_report_amount,
                    'have_pay_report': my_detail.have_pay_report
                }));
                $el.find('.o_my_screen').append($my_detail);

            }

        },
        /**
         * @memberOf My_screen
         * @description 显示我的信息界面
         * @param el
         * @param options
         */
        attach: function (el, options) {
            this.load_data(this);
            this._super(el, options);
        },
        /**
         * @memberOf My_screen
         * @description 设置钉钉界面抬头内容
         */
        setTitle: function () {
            this.title = "我的"
            this._super();
        }
    });


    return Main;
})
;
