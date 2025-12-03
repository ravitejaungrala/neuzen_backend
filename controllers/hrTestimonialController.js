// backend/controllers/hrTestimonialController.js
import User from '../models/User.js';

// backend/controllers/hrTestimonialController.js - Update getHRTestimonials function
export const getHRTestimonials = async (req, res) => {
  try {
    console.log('Fetching HR testimonials...');
    
    // Get all HR users who have testimonials (public endpoint - no auth required)
    const hrUsers = await User.find({ 
      role: 'hr',
      'profile.testimonial.content': { $exists: true, $ne: '' }
    })
    .select('fullName email avatar profile companyName')
    .sort({ 'profile.testimonial.updatedAt': -1 })
    .limit(10);

    console.log(`Found ${hrUsers.length} HR users with testimonials`);

    // Format testimonials
    const testimonials = hrUsers.map(user => {
      const testimonial = user.profile?.testimonial || {};
      
      return {
        id: user._id,
        name: user.fullName || 'HR Professional',
        position: testimonial.position || 'HR Professional',
        company: user.companyName || 'Company',
        content: testimonial.content || '',
        rating: testimonial.rating || 5,
        avatar: user.avatar || getAvatarEmoji(user.fullName),
        date: testimonial.updatedAt || user.updatedAt
      };
    });

    console.log(`Formatted ${testimonials.length} testimonials`);

    res.json({
      status: 'success',
      data: {
        testimonials,
        total: testimonials.length,
        hrCount: hrUsers.length
      }
    });
  } catch (error) {
    console.error('Get HR testimonials error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching testimonials',
      error: error.message 
    });
  }
};

// Update user's testimonial
export const updateUserTestimonial = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { content, position, rating } = req.body;

    if (!content || !position) {
      return res.status(400).json({
        status: 'error',
        message: 'Content and position are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        'profile.testimonial': {
          content,
          position,
          rating: rating || 5,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    return res.json({
      status: 'success',
      message: 'Testimonial updated successfully!',
      data: { testimonial: user?.profile?.testimonial || null }
    });
  } catch (error) {
    console.error('Update testimonial error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Error updating testimonial',
      error: error.message 
    });
  }
};

// Get user's testimonial
export const getUserTestimonial = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('profile companyName');
    return res.json({
      status: 'success',
      data: {
        testimonial: user?.profile?.testimonial || null,
        companyName: user?.companyName || null
      }
    });
  } catch (error) {
    console.error('Get user testimonial error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Error fetching testimonial',
      error: error.message 
    });
  }
};

// Helper
function getAvatarEmoji(name) {
  if (!name) return '👤';
  const femaleNames = ['Sarah', 'Emily', 'Jane', 'Mary', 'Anna', 'Lisa', 'Emma', 'Olivia'];
  const maleNames = ['Michael', 'John', 'David', 'Robert', 'James', 'William', 'Richard', 'Charles'];
  const firstName = name.split(' ')[0];
  if (femaleNames.includes(firstName)) return '👩‍💼';
  if (maleNames.includes(firstName)) return '👨‍💼';
  return '👤';
}
