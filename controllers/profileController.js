// controllers/profileController.js
import Profile from '../models/profile.js'; // ⚠️ keep lowercase to avoid casing issue

// Helper to find profile by userId
const findProfileByUserId = async (userId) => {
    console.info(`[PROFILE] Searching profile for userId: ${userId}`);

    const profile = await Profile.findOne({ userId });

    if (!profile) {
        console.warn(`[PROFILE] Profile NOT found for userId: ${userId}`);
        throw new Error('Profile not found');
    }

    console.info(`[PROFILE] Profile found for userId: ${userId}`);
    return profile;
};

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

        console.info(`[GET PROFILE] Success | userId: ${userId}`);
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
        const existing = await Profile.findOne({ userId });

        if (existing) {
            console.warn(`[CREATE PROFILE] Profile already exists | userId: ${userId}`);
            return res.status(400).json({ message: 'Profile already exists' });
        }

        const profile = await Profile.create({
            userId,
            profile: {
                fullName: req.body.fullName || 'User',
                email: req.body.email?.toLowerCase().trim(),
                avatarUrl: req.body.avatarUrl,
                bio: req.body.bio || '',
            },
        });

        console.info(`[CREATE PROFILE] Success | profileId: ${profile._id}`);

        res.status(201).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error(`[CREATE PROFILE] Error | userId: ${userId}`, error.message);
        res.status(400).json({ message: error.message || 'Invalid data' });
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
