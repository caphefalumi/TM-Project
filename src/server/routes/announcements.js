import connectDB from '../config/db.js'

import Teams from '../models/Teams.js'
import UsersOfTeam from '../models/UsersOfTeam.js'
import Announcements from '../models/Announcements.js'

const getAnnouncementsOfTeam = async (req, res) => {
  // Get all announcements of a team
  // Returns an array of announcements sorted by createdAt in descending order
  // Requires teamId as a parameter
  await connectDB()
  try {
    const { teamId } = req.params
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' })
    }

    const teamExists = await Teams.exists({ _id: teamId })
    if (!teamExists) {
      return res.status(404).json({ message: 'Team not found' })
    }

    const announcements = await Announcements.find({ teamId }).sort({ createdAt: -1 })
    if (announcements.length === 0) {
      console.log(`No announcements found for team ${teamId}`)
      return res.status(200).json({ announcements: [] })
    }
    return res.status(200).json({ announcements })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const addAnnouncement = async (req, res) => {
    // Add a new announcement to a team
    // Requires teamId, title, content, and createdBy in the request body
    await connectDB()
    try {
        const { title, subtitle, content, createdBy } = req.body
        const { teamId } = req.params
        if (!teamId || !title || !content || !createdBy) {
          return res.status(400).json({ message: 'All fields are required' })
        }
        
        if(subtitle == undefined || subtitle == null) {
          subtitle = ''
        }
    
        const teamExists = await Teams.exists({ _id: teamId })
        if (!teamExists) {
        return res.status(404).json({ message: 'Team not found' })
        }
    
        const newAnnouncement = new Announcements({
          teamId,
          title,
          subtitle,
          content,
          createdBy,
        })
    
        await newAnnouncement.save()
        return res.status(201).json({ message: 'Announcement added successfully', announcement: newAnnouncement })
    } catch (error) {
        console.error('Error adding announcement:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

const deleteAnnouncement = async (req, res) => {
  // Delete an announcement by ID
  // Requires announcementId as a parameter
  await connectDB()
  try {
    const { announcementId } = req.params
    if (!announcementId) {
      return res.status(400).json({ message: 'Announcement ID is required' })
    }

    const announcement = await Announcements.findByIdAndDelete(announcementId)
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' })
    }
    return res.status(200).json({ message: 'Announcement deleted successfully' })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

const updateAnnouncement = async (req, res) => {
    // Update an announcement by ID
    // Requires announcementId in the request body and at least one field to update

    await connectDB()
    try {
        const { id, title, subtitle, content, createdBy } = req.body
        const { teamId } = req.params
        console.log('Update announcement request:', { id, title, subtitle, content, createdBy, teamId })
        if (!teamId) {
          console.log('Team ID is required')
          return res.status(400).json({ message: 'Team ID is required' })
        }
        if ( !title || !content || !createdBy || !id) {
          console.log('Missing required fields:', { id, title, content, createdBy })
          return res.status(400).json({ message: 'Announcement ID and at least one field to update are required' })
        }
        if(subtitle == undefined || subtitle == null) {
          subtitle = ''
        }
        const announcement = await Announcements.findById(id)
        if (!announcement) {
          return res.status(404).json({ message: `Announcement not found with ID: ${id}` })
        }
        // Update the announcement fields
        announcement.title = title
        announcement.subtitle = subtitle
        announcement.content = content
        announcement.createdBy = createdBy
        announcement.updatedAt = new Date() // Update the updatedAt field
        // Save the updated announcement
        await announcement.save()
        return res.status(200).json({ message: 'Announcement updated successfully', announcement })
    } catch (error) {
        console.error('Error updating announcement:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

const toggleLikeAnnouncement = async (req, res) => {
  // Toggle like status of an announcement for a user
  // Requires announcementId and userId in the request body
  await connectDB()
  try {
    const { userId } = req.body
    const { announcementId } = req.params
    console.log('Toggle like announcement request:', { announcementId, userId })
    if (!announcementId || !userId) {
      console.log('Announcement ID and User ID are required')
      return res.status(400).json({ message: 'Announcement ID and User ID are required' })
    }

    const announcement = await Announcements.findById(announcementId)
    if (!announcement) {
      console.log(`Announcement not found with ID: ${announcementId}`)
      return res.status(404).json({ message: 'Announcement not found' })
    }

    if(announcement.likeUsers.includes(userId)) {
      // User already liked the announcement, remove like
      announcement.likeUsers = announcement.likeUsers.filter(user => user !== userId)
      console.log(`User ${userId} unliked announcement ${announcementId}`)
    } else {
      // User has not liked the announcement, add like
      announcement.likeUsers.push(userId)
      console.log(`User ${userId} liked announcement ${announcementId}`)
    }
    await announcement.save()
    return res.status(200).json({ message: 'Like status toggled successfully', announcement })
  }
  catch (error) {
    console.error('Error toggling like status:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export default {
  getAnnouncementsOfTeam,
  addAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  toggleLikeAnnouncement,
}