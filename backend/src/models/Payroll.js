import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    payslipNumber: { type: String, unique: true },
    basicSalary: { type: Number, required: true },
    allowances: {
      hra: { type: Number, default: 0 },
      da: { type: Number, default: 0 },
      ta: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    grossSalary: { type: Number, required: true },
    deductions: {
      pf: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      unpaidLeave: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PAID'], default: 'DRAFT' },
    paidAt: { type: Date, default: null },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payroll', payrollSchema);
