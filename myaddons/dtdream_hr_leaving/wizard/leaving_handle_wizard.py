# -*- coding: utf-8 -*-

from openerp import models, fields, api

class leaving_handle_wizard(models.TransientModel):
    _name = 'leaving.handle.wizard'

    def _default_manager_id(self):
        active_id = self._context['active_id']
        current_leaving_handle = self.env['leaving.handle'].browse(active_id)
        return current_leaving_handle.department_id.manager_id

    def _default_assistant_id(self):
        active_id = self._context['active_id']
        current_leaving_handle = self.env['leaving.handle'].browse(active_id)
        if(len(current_leaving_handle.department_id.assitant_id) >0):
            return current_leaving_handle.department_id.assitant_id[0]


    name = fields.Char("审批环节")
    result = fields.Selection([("agree","同意"),("reject","驳回到上一步"),("other","不涉及")])
    opinion = fields.Text("意见", required=True)
    actual_leavig_date = fields.Date("实际离岗时间")
    leaving_handle_id = fields.Many2one("leaving.handle",string="离职交接申请")
    current_state = fields.Char("当前环节")
    mail_ccs = fields.Many2many('hr.employee',string="抄送人")
    manager_id = fields.Many2one('hr.employee',string="主管",default=_default_manager_id)
    assistant_id = fields.Many2one('hr.employee',string="行政助理",default=_default_assistant_id)

    # 给抄送人发送的邮件
    def cc_mail(self, current_leaving_handle):
        subject = '%s的离职办理已经启动，请您知悉' % current_leaving_handle.name.user_id.name
        email_cc = "";
        for record in self.mail_ccs:
            email_cc += record.work_email + ";"
        if email_cc:
            base_url = current_leaving_handle.get_base_url()
            link = '/web#id=%s&view_type=form&model=leaving.handle' % current_leaving_handle.id
            url = base_url + link
            self.env['mail.mail'].create({
                'body_html': '<p>您好</p>'
                             '<p>%s的离职办理已经启动</p>'
                             '<p>请点击链接进入查看:'
                             '<a href="%s">%s</a></p>'
                             '<p>dodo</p>'
                             '<p>万千业务，简单有do</p>'
                             '<p>%s<p>' % (
                                current_leaving_handle.name.user_id.name, url, url, self.write_date[:10]),
                'subject': subject,
                'email_to': email_cc,
                'auto_delete': False,
            }).send()

    @api.one
    def btn_agree(self):
        active_id = self._context['active_id']
        current_leaving_handle = self.env['leaving.handle'].browse(active_id)
        if self.current_state == "4":
            current_leaving_handle.write({"actual_leavig_date":self.actual_leavig_date})
        if self.current_state == "1":
            current_leaving_handle.write({"manager_id": self.manager_id.id})
            current_leaving_handle.write({"assistant_id": self.assistant_id.id})

        self.name = current_leaving_handle.state_dict[current_leaving_handle.state]
        mail_ccs_user_ids = []
        for rec in self.mail_ccs:
            mail_ccs_user_ids.append(rec.id)

        self.env['leaving.handle.approve.record'].create({"name":self.name,"result":"agree", "opinion":self.opinion,
                                                          "leaving_handle_id":active_id,"mail_ccs":[(6, 0, mail_ccs_user_ids)]})
        current_leaving_handle.signal_workflow('btn_agree')
        self.cc_mail(current_leaving_handle)

    @api.one
    def btn_reject(self):
        active_id = self._context['active_id']
        current_leaving_handle = self.env['leaving.handle'].browse(active_id)
        if self.current_state == "4":
            current_leaving_handle.write({"actual_leavig_date": self.actual_leavig_date})
        if self.current_state == "1":
            current_leaving_handle.write({"manager_id": self.manager_id.id})
            current_leaving_handle.write({"assistant_id": self.assistant_id.id})
        self.name = current_leaving_handle.state_dict[current_leaving_handle.state]
        mail_ccs_user_ids = []
        for rec in self.mail_ccs:
            mail_ccs_user_ids.append(rec.id)
        self.env['leaving.handle.approve.record'].create({"name":self.name,"result":"reject", "opinion":self.opinion,
                                                          "leaving_handle_id":active_id,"mail_ccs":[(6, 0, mail_ccs_user_ids)]})
        current_leaving_handle.signal_workflow('btn_reject')

    @api.one
    def btn_other(self):
        active_id = self._context['active_id']
        current_leaving_handle = self.env['leaving.handle'].browse(active_id)
        if self.current_state == "4":
            current_leaving_handle.write({"actual_leavig_date": self.actual_leavig_date})
        if self.current_state == "1":
            current_leaving_handle.write({"manager_id": self.manager_id.id})
            current_leaving_handle.write({"assistant_id": self.assistant_id.id})
        self.name = current_leaving_handle.state_dict[current_leaving_handle.state]
        mail_ccs_user_ids = []
        for rec in self.mail_ccs:
            mail_ccs_user_ids.append(rec.id)
        self.env['leaving.handle.approve.record'].create({"name": self.name, "result": "other", "opinion": self.opinion,
                                                          "leaving_handle_id": active_id,"mail_ccs":[(6, 0, mail_ccs_user_ids)]})
        current_leaving_handle.signal_workflow('btn_agree')
        self.cc_mail(current_leaving_handle)
