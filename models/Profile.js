import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        profile: {
            fullName: {
                type: String,
                required: [true, 'Full name is required'],
                trim: true,
                default: 'User',
            },
            avatarUrl: {
                type: String,
                default: 'https://via.placeholder.com/150', // default avatar
            },
            bio: {
                type: String,
                default: '',
                maxlength: [200, 'Bio cannot exceed 200 characters'],
            },
            email: {
                type: String,
                required: [true, 'Email is required'],
                unique: true,
                lowercase: true,
                trim: true,
            },
        },
        stats: {
            totalTasks: {
                type: Number,
                default: 0,
                min: [0, 'Total Tasks completed cannot be negative'],
            },
            tasksCompleted: {
                type: Number,
                default: 0,
                min: [0, 'Tasks completed cannot be negative'],
            },
            pendingTasks: {
                type: Number,
                default: 0,
                min: [0, 'Tasks Pending cannot be negative'],
            },
            overdueTasks: {
                type: Number,
                default: 0,
                min: [0, 'Tasks overdue cannot be negative'],
            },
            streak: {
                type: Number,
                default: 0,
                min: [0, 'Tasks streak cannot be negative'],
            },

        },
        aiFeatures: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);


const Profile = mongoose.model('Profile', profileSchema);

export default Profile;