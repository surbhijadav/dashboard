import mongoose from 'mongoose';

const WorkspaceMemberSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'editor',
    },
    status: {
      type: String,
      enum: ['accepted', 'pending'],
      default: 'accepted',
    },
  },
  { timestamps: true }
);

WorkspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });

export default mongoose.models.WorkspaceMember || mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
