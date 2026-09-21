import { announcementModel } from '../models/announcementModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';

export const announcementService = {
  async createAnnouncement(userId, { title, body, publishedDate }, ipAddress = null) {
    const id = await announcementModel.create({
      title,
      body,
      publishedDate,
      createdBy: userId
    });

    await auditService.log(userId, 'CREATE_ANNOUNCEMENT', 'announcements', id, { title }, ipAddress);
    return await announcementModel.findById(id);
  },

  async updateAnnouncement(userId, id, { title, body, publishedDate }, ipAddress = null) {
    const existing = await announcementModel.findById(id);
    if (!existing) {
      throw new AppError(`Announcement with ID ${id} not found`, 404, 'ANNOUNCEMENT_NOT_FOUND');
    }

    await announcementModel.update(id, {
      title,
      body,
      publishedDate,
      updatedBy: userId
    });

    await auditService.log(userId, 'UPDATE_ANNOUNCEMENT', 'announcements', id, { title }, ipAddress);
    return await announcementModel.findById(id);
  },

  async deleteAnnouncement(userId, id, ipAddress = null) {
    const existing = await announcementModel.findById(id);
    if (!existing) {
      throw new AppError(`Announcement with ID ${id} not found`, 404, 'ANNOUNCEMENT_NOT_FOUND');
    }

    await announcementModel.delete(id);
    await auditService.log(userId, 'DELETE_ANNOUNCEMENT', 'announcements', id, { title: existing.title }, ipAddress);
    return true;
  },

  async listAnnouncements(filters) {
    const announcements = await announcementModel.findAllReverseChronological(filters);
    const total = await announcementModel.countAll(filters);
    return { announcements, total };
  },

  async getAnnouncementById(id) {
    const item = await announcementModel.findById(id);
    if (!item) {
      throw new AppError(`Announcement with ID ${id} not found`, 404, 'ANNOUNCEMENT_NOT_FOUND');
    }
    return item;
  }
};
