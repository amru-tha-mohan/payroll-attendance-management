import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: {
      hra: { type: Number, default: 0 },
      da: { type: Number, default: 0 },
      ta: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('Employee', employeeSchema);
