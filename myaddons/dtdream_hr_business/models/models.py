# -*- coding: utf-8 -*-

from openerp import models, fields, api
from datetime import datetime
from openerp.exceptions import ValidationError
# from lxml import etree

class dtdream_hr_business(models.Model):
    _name = 'dtdream_hr_business.dtdream_hr_business'
    _inherit = ['mail.thread']

    name = fields.Many2one("hr.employee",string="花名",required=True)

    @api.depends('name')
    def _compute_employee(self):
        for rec in self:
            rec.job_number=rec.name.job_number
            rec.full_name=rec.name.full_name
            rec.department=rec.name.department_id.complete_name
            rec.approver_fir = rec.name.department_id.assitant_id
            rec.current_approver = rec.name

    full_name = fields.Char(compute=_compute_employee,string="姓名")
    job_number = fields.Char(compute=_compute_employee,string="工号")
    department = fields.Char(compute=_compute_employee,string="部门")
    create_time= fields.Date(string='申请时间',default=datetime.today(),readonly=1)
    approver_fir = fields.Many2one("hr.employee" ,compute=_compute_employee,string="第一审批人",store=True)
    approver_sec = fields.Many2one("hr.employee",string="第二审批人")
    approver_thr = fields.Many2one("hr.employee",string="第三审批人")
    approver_fou = fields.Many2one("hr.employee",string="第四审批人")
    approver_fif = fields.Many2one("hr.employee",string="第五审批人")

    current_approver = fields.Many2one("hr.employee" ,compute=_compute_employee,string="当前审批人",store=True)

    his_app = fields.Many2many("hr.employee")

    @api.one
    def _compute_is_shenpiren(self):
        if self.name.user_id == self.env.user:
            self.is_shenqingren = True
        else:
            self.is_shenqingren = False
        if self.current_approver.user_id == self.env.user:
            self.is_shenpiren = True
        else:
            self.is_shenpiren = False
        if 1 == self.env.user.id:
            self.is_admin = True
        else:
            self.is_admin = False

    is_admin = fields.Boolean(compute=_compute_is_shenpiren, string="是否管理员",)

    is_shenpiren = fields.Boolean(compute=_compute_is_shenpiren, string="当前用户是否审批人",default=True)

    is_shenqingren = fields.Boolean(compute=_compute_is_shenpiren, string="当前用户是否申请人",default=True)

    state = fields.Selection([('-1','草稿'),('0','第一审批人审批'),('1','第二审批人审批'),('2','第三审批人审批'),('3','第四审批人审批'),('4','第五审批人审批'),('5','通过'),('99','驳回')],string="状态",default='-1')

    @api.depends('name','create_time')
    def _compute_title(self):
        for rec in self:
            rec.title = rec.name.name_related +u'于'+rec.create_time+u'提交的外出公干申请'


    title = fields.Char(compute=_compute_title,string="事件")
    detail_ids = fields.One2many("dtdream_hr_business.business_detail","business","明细")

    @api.model
    def create(self, vals):
        empl = self.env['hr.employee'].browse(vals['name'])
        if not empl['department_id']['assitant_id']:
            raise ValidationError("请先配置该部门的行政助理")
        result = super(dtdream_hr_business, self).create(vals)
        return  result

    @api.model
    def wkf_draft(self):                            #创建
        self.write({'state': '-1'})

    @api.model
    def wkf_first(self):                            #提交
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        self.write({'state': '0'})
        self.write({'current_approver':self.approver_fir.id})
        self.write({'his_app': [(4, self.approver_fir.user_id.id)]})
        print self.his_app

    @api.model
    def wkf_sec(self):                                      #第一审批人批准
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        if self.approver_sec:
            self.write({'state': '1'})
            self.write({'current_approver':self.approver_sec.id})
            self.write({'his_app': [(4, self.approver_sec.user_id.id)]})
            print self.his_app
        else:
            raise ValidationError("配置第二审批人")

    @api.model
    def wkf_thr(self):                                      #第二审批人批准
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        if self.approver_thr:
            self.write({'state': '2'})
            self.write({'current_approver':self.approver_thr.id})
            self.write({'his_app': [(4, self.approver_thr.user_id.id)]})
        else:
            self.write({'state': '5'})

    @api.model
    def wkf_fou(self):                                       #第三审批人批准
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        if self.approver_fou:
            self.write({'state': '3'})
            self.write({'current_approver':self.approver_fou.id})
            self.write({'his_app': [(4, self.approver_fou.user_id.id)]})
        else:
            self.write({'state': '5'})


    @api.model
    def wkf_fif(self):                                       #第四审批人批准
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        if self.approver_fif:
            self.write({'state': '4'})
            self.write({'current_approver':self.approver_fif.id})
            self.write({'his_app': [(4, self.approver_fif.user_id.id)]})
        else:
            self.write({'state': '5'})

    @api.model
    def wkf_accept(self):                                        #第五审批人批准
        lg = len(self.detail_ids)
        if lg<=0:
            raise ValidationError("请至少填写一条明细")
        self.write({'state': '5'})

    @api.model
    def wkf_refuse(self):                                       #各审批人拒绝
        self.write({'state': '99'})
        self.write({'current_approver':self.name.id})


    # @api.multi
    # def unlink(self):
    #     for record in self:
    #         if record.state != '-1' or record.name.id != self.user.id:
    #             raise ValidationError("您不是申请人或该流程已提交审批")
    #         record.detail_ids.unlink()
    #     return super(dtdream_hr_business, self).unlink()

class business_detail(models.Model):
    _name = "dtdream_hr_business.business_detail"
    name=fields.Char()
    place = fields.Char("外出地点" , required="1")
    startTime = fields.Datetime("开始时间" ,required="1")
    endTime = fields.Datetime("结束时间" ,required="1")
    reason = fields.Text("事由",required="1")
    business = fields.Many2one("dtdream_hr_business.dtdream_hr_business",ondelete="cascade")


    def _check_date(self, cr, uid, ids, context=None):
        for event in self.browse(cr, uid, ids, context=context):
            if event.endTime < event.startTime:
                return False
        return True

    _constraints = [
        (_check_date, u'开始时间不能晚于结束时间!', ["startTime","endTime"]),
        ]