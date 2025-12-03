import Notification from '../models/Notification.js';
import Application from '../models/Application.js';

// Get candidate notifications
export const getCandidateNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get notifications for candidate
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      status: 'success',
      data: {
        notifications
      }
    });
  } catch (error) {
    console.error('Get candidate notifications error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate notifications',
      error: error.message 
    });
  }
};

// Mark notification as read
export const markCandidateNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error('Mark candidate notification as read error:', error);
    res.status(500).json({ 
      message: 'Error marking candidate notification as read',
      error: error.message 
    });
  }
};