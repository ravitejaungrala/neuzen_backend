import User from '../models/User.js';
import Company from '../models/Company.js';
import upload from '../middleware/upload.js';

// Get HR user settings
export const getHRSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get company data
    let companyData = null;
    if (user.role === 'hr') {
      companyData = await Company.findOne({ 'team.user': userId });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          companyName: user.companyName,
          avatar: user.avatar,
          profile: user.profile || {},
          preferences: user.preferences || {
            notifications: {
              email: true,
              push: true,
              sms: false
            },
            theme: 'light',
            language: 'en'
          },
          isVerified: user.isVerified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        company: companyData
      }
    });
  } catch (error) {
    console.error('Get HR settings error:', error);
    res.status(500).json({ 
      message: 'Error fetching HR settings',
      error: error.message 
    });
  }
};

// Update HR profile
export const updateHRProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.isVerified;
    delete updates.isActive;

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare update data
    const updateData = {};
    
    // Update basic fields
    if (updates.fullName !== undefined) updateData.fullName = updates.fullName;
    if (updates.mobile !== undefined) updateData.mobile = updates.mobile;
    if (updates.companyName !== undefined) {
      updateData.companyName = updates.companyName;
    }

    // Update profile object
    if (updates.profile) {
      updateData.profile = {
        ...existingUser.profile,
        ...updates.profile
      };
    }

    // Update preferences
    if (updates.preferences) {
      updateData.preferences = {
        ...existingUser.preferences,
        ...updates.preferences
      };
    }

    // Perform update
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update company name if HR user
    if (user.role === 'hr' && updates.companyName) {
      await Company.findOneAndUpdate(
        { 'team.user': userId },
        { 
          $set: { 
            name: updates.companyName,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          companyName: user.companyName,
          avatar: user.avatar,
          profile: user.profile,
          preferences: user.preferences,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Update HR profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error',
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Mobile number already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Error updating HR profile',
      error: error.message 
    });
  }
};

// Update HR company settings
export const updateHRCompanySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has admin role
    const userRole = company.team.find(member => 
      member.user.toString() === userId.toString()
    );
    
    if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
      return res.status(403).json({ message: 'Not authorized to update company settings' });
    }

    // Update company settings
    const updateData = {};
    
    // Update basic company info
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.industry !== undefined) updateData.industry = updates.industry;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.headquarters !== undefined) updateData.headquarters = updates.headquarters;
    if (updates.contact !== undefined) updateData.contact = updates.contact;
    if (updates.social !== undefined) updateData.social = updates.social;

    // Update settings
    if (updates.settings) {
      updateData.settings = {
        ...company.settings,
        ...updates.settings
      };
    }

    // Update subscription
    if (updates.subscription) {
      updateData.subscription = {
        ...company.subscription,
        ...updates.subscription
      };
    }

    // Perform update
    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'Company settings updated successfully',
      data: {
        company: updatedCompany
      }
    });
  } catch (error) {
    console.error('Update HR company settings error:', error);
    res.status(500).json({ 
      message: 'Error updating HR company settings',
      error: error.message 
    });
  }
};

// Upload HR profile picture
export const uploadHRProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update avatar URL
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: {
        avatar: user.avatar,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Upload HR profile picture error:', error);
    res.status(500).json({ 
      message: 'Error uploading HR profile picture',
      error: error.message 
    });
  }
};