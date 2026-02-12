// controllers/profileController.js
import Profile from '../models/Profile.js';
import TaskList from "../models/TaskList.js";
import path from 'path';
import fs from 'fs';

// @desc    Get profile by userId
// @route   GET /api/profile/:userId
// @access  Private
export const getProfile = async (req, res) => {
    const { userId } = req.params;
    console.info(`[GET PROFILE] Request received | userId: ${userId}`);

    try {
        const profile = await Profile
            .findOne({ userId })
            .select('-__v');

        if (!profile) {
            console.warn(`[GET PROFILE] Profile not found | userId: ${userId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        console.info(`[GET PROFILE] Success | userId: ${userId} | avatarUrl: ${profile.profile.avatarUrl}`);
        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error(`[GET PROFILE] Error | userId: ${userId}`, error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create new profile
// @route   POST /api/profile
// @access  Private

export const createProfile = async (req, res) => {
    const { userId } = req.body;

    console.info(`[CREATE PROFILE] Attempt | userId: ${userId}`);

    try {
        // Check if profile already exists
        const existingProfile = await Profile.findOne({ userId });
        if (existingProfile) {
            console.warn(`[CREATE PROFILE] Profile already exists | userId: ${userId}`);
            return res.status(400).json({ message: "Profile already exists" });
        }

        // Create the user profile
        const profile = await Profile.create({
            userId,
            profile: {
                fullName: req.body.fullName || "User",
                email: req.body.email?.toLowerCase().trim(),
                avatarUrl: req.body.avatarUrl,
                bio: req.body.bio || "",
            },
        });

        // Create default task list: "My Tasks"
        try {
            await TaskList.create({
                userId,
                title: "My Tasks",
                taskIds: [],
                isDefault: true,
            });

            console.info(`[CREATE PROFILE] Default task list "My Tasks" created | userId: ${userId}`);
        } catch (taskListError) {
            // Log but don't fail the whole profile creation if task list fails
            console.error(`[CREATE PROFILE] Failed to create default task list | userId: ${userId}`, taskListError);
            // Optionally: you could delete the profile here if you want strict consistency,
            // but usually it's better to allow profile creation and fix task list later.
        }

        console.info(`[CREATE PROFILE] Success | profileId: ${profile._id}`);
        res.status(201).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error(`[CREATE PROFILE] Error | userId: ${userId}`, error.message);
        res.status(400).json({ message: error.message || "Invalid data" });
    }
};

// @desc    Update profile
// @route   PUT /api/profile/:userId
// @access  Private
export const updateProfile = async (req, res) => {
    const { userId } = req.params;
    console.info(`[UPDATE PROFILE] Request | userId: ${userId}`);

    try {
        const updates = req.body;

        if (updates.userId) {
            console.warn(`[UPDATE PROFILE] Attempt to modify userId blocked | userId: ${userId}`);
            return res.status(400).json({ message: 'Cannot update userId' });
        }

        const updatedProfile = await Profile.findOneAndUpdate(
            { userId },
            { $set: updates },
            {
                new: true,
                select: '-__v',
            }
        );

        if (!updatedProfile) {
            console.warn(`[UPDATE PROFILE] Profile not found | userId: ${userId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        console.info(`[UPDATE PROFILE] Success | userId: ${userId}`);
        res.status(200).json({
            success: true,
            data: updatedProfile,
        });
    } catch (error) {
        console.error(`[UPDATE PROFILE] Error | userId: ${userId}`, error.message);
        res.status(400).json({ message: error.message || 'Update failed' });
    }
};

// @desc    Delete profile
// @route   DELETE /api/profile/:userId
// @access  Private
export const deleteProfile = async (req, res) => {
    const { userId } = req.params;
    console.info(`[DELETE PROFILE] Request | userId: ${userId}`);

    try {
        const profile = await Profile.findOneAndDelete({ userId });

        if (!profile) {
            console.warn(`[DELETE PROFILE] Profile not found | userId: ${userId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        console.info(`[DELETE PROFILE] Success | userId: ${userId}`);
        res.status(200).json({
            success: true,
            message: 'Profile deleted successfully',
        });
    } catch (error) {
        console.error(`[DELETE PROFILE] Error | userId: ${userId}`, error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Upload profile photo
// @route   POST /api/profile/:userId/photo
// @access  Private
export const uploadProfilePhoto = async (req, res) => {
    const { userId } = req.params;
    console.info(`[UPLOAD PHOTO] Request | userId: ${userId}`);

    try {
        // Check if file was uploaded
        if (!req.file) {
            console.warn(`[UPLOAD PHOTO] No file provided | userId: ${userId}`);
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Check if profile exists
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            // Delete uploaded file if profile doesn't exist
            fs.unlinkSync(req.file.path);
            console.warn(`[UPLOAD PHOTO] Profile not found | userId: ${userId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Delete old photo if it exists and is not the default placeholder
        if (profile.profile.avatarUrl &&
            !profile.profile.avatarUrl.includes('placeholder') &&
            !profile.profile.avatarUrl.startsWith('http')) {
            try {
                const oldPhotoPath = path.join(process.cwd(), profile.profile.avatarUrl);
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                    console.info(`[UPLOAD PHOTO] Old photo deleted | userId: ${userId}`);
                }
            } catch (deleteError) {
                console.error(`[UPLOAD PHOTO] Error deleting old photo | userId: ${userId}`, deleteError.message);
                // Continue even if old photo deletion fails
            }
        }

        // Generate the URL for the uploaded photo
        const photoUrl = `/uploads/profile-photos/${req.file.filename}`;

        // Update profile with new photo URL
        const updatedProfile = await Profile.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'profile.avatarUrl': photoUrl
                }
            },
            {
                new: true,
                select: '-__v',
            }
        );

        console.info(`[UPLOAD PHOTO] Success | userId: ${userId} | file: ${req.file.filename}`);
        res.status(200).json({
            success: true,
            message: 'Photo uploaded successfully',
            data: {
                avatarUrl: photoUrl,
                profile: updatedProfile
            }
        });
    } catch (error) {
        // Delete uploaded file if database update fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error(`[UPLOAD PHOTO] Error | userId: ${userId}`, error.message);
        res.status(500).json({ message: 'Failed to upload photo' });
    }
};

// @desc    Delete profile photo
// @route   DELETE /api/profile/:userId/photo
// @access  Private
export const deleteProfilePhoto = async (req, res) => {
    const { userId } = req.params;
    console.info(`[DELETE PHOTO] Request | userId: ${userId}`);

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            console.warn(`[DELETE PHOTO] Profile not found | userId: ${userId}`);
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Delete the photo file if it exists and is not the default placeholder
        if (profile.profile.avatarUrl &&
            !profile.profile.avatarUrl.includes('placeholder') &&
            !profile.profile.avatarUrl.startsWith('http')) {
            try {
                const photoPath = path.join(process.cwd(), profile.profile.avatarUrl);
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                    console.info(`[DELETE PHOTO] Photo file deleted | userId: ${userId}`);
                }
            } catch (deleteError) {
                console.error(`[DELETE PHOTO] Error deleting photo file | userId: ${userId}`, deleteError.message);
            }
        }

        // Reset to default avatar
        const updatedProfile = await Profile.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'profile.avatarUrl': 'https://via.placeholder.com/150'
                }
            },
            {
                new: true,
                select: '-__v',
            }
        );

        console.info(`[DELETE PHOTO] Success | userId: ${userId}`);
        res.status(200).json({
            success: true,
            message: 'Photo deleted successfully',
            data: updatedProfile
        });
    } catch (error) {
        console.error(`[DELETE PHOTO] Error | userId: ${userId}`, error.message);
        res.status(500).json({ message: 'Failed to delete photo' });
    }
};

