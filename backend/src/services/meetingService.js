import { meetingModel } from '../models/meetingModel.js';
import { agendaItemModel } from '../models/agendaItemModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';
import { query } from '../config/database.js';

export const meetingService = {
  async createMeeting(userId, { title, meetingDate, location }, ipAddress = null) {
    const meetingId = await meetingModel.create({
      title,
      meetingDate,
      location,
      createdBy: userId
    });

    await auditService.log(userId, 'CREATE_MEETING', 'meetings', meetingId, { title, meetingDate, location }, ipAddress);
    return await meetingModel.findById(meetingId);
  },

  async updateMeeting(user, id, { title, meetingDate, location, status }, ipAddress = null) {
    const existing = await meetingModel.findById(id);
    if (!existing) {
      throw new AppError(`Meeting with ID ${id} not found`, 404, 'MEETING_NOT_FOUND');
    }

    if (existing.status === 'cancelled' && user.role !== 'ADMINISTRATOR') {
      throw new AppError('Only administrators can modify a cancelled meeting', 403, 'CANCELLED_MEETING_LOCKED');
    }

    await meetingModel.update(id, {
      title,
      meetingDate,
      location,
      status,
      updatedBy: user.id
    });

    await auditService.log(user.id, 'UPDATE_MEETING', 'meetings', id, { title, meetingDate, location, status }, ipAddress);
    return await meetingModel.findById(id);
  },

  async cancelMeeting(user, id, reason, ipAddress = null) {
    const existing = await meetingModel.findById(id);
    if (!existing) {
      throw new AppError(`Meeting with ID ${id} not found`, 404, 'MEETING_NOT_FOUND');
    }

    if (existing.status === 'cancelled') {
      throw new AppError('Meeting is already marked as cancelled', 400, 'ALREADY_CANCELLED');
    }

    await meetingModel.markCancelled(id, reason, user.id);
    await auditService.log(user.id, 'CANCEL_MEETING', 'meetings', id, { reason }, ipAddress);
    return await meetingModel.findById(id);
  },

  async recordMinutes(user, id, { minutesText, minutesStatus = 'draft' }, ipAddress = null) {
    const existing = await meetingModel.findById(id);
    if (!existing) {
      throw new AppError(`Meeting with ID ${id} not found`, 404, 'MEETING_NOT_FOUND');
    }

    // FRS Non-functional requirement: Published minutes cannot be changed by non-administrators
    if (existing.minutes_status === 'published' && user.role !== 'ADMINISTRATOR') {
      throw new AppError(
        'Published minutes are locked and cannot be modified by non-administrators',
        403,
        'PUBLISHED_MINUTES_LOCKED'
      );
    }

    await meetingModel.updateMinutes(id, {
      minutesText,
      minutesStatus,
      updatedBy: user.id
    });

    const action = minutesStatus === 'published' ? 'PUBLISH_MINUTES' : 'RECORD_MINUTES';
    await auditService.log(user.id, action, 'meetings', id, { minutesStatus }, ipAddress);

    return await meetingModel.findById(id);
  },

  async getMeetingDetails(id) {
    const meeting = await meetingModel.findById(id);
    if (!meeting) {
      throw new AppError(`Meeting with ID ${id} not found`, 404, 'MEETING_NOT_FOUND');
    }

    // Fetch related agenda items
    const agendaItems = await agendaItemModel.findByMeetingId(id);

    // Fetch linked motions
    const [motions] = await query(
      `SELECT m.*, ai.title as agenda_item_title
       FROM motions m
       LEFT JOIN agenda_items ai ON m.agenda_item_id = ai.id
       WHERE m.meeting_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );

    // Fetch linked documents
    const [documents] = await query(
      `SELECT d.* FROM documents d WHERE d.meeting_id = ? ORDER BY d.created_at DESC`,
      [id]
    );

    return {
      ...meeting,
      agendaItems,
      motions,
      documents
    };
  },

  async listMeetings(filters) {
    const meetings = await meetingModel.findAllChronological(filters);
    const total = await meetingModel.countAll(filters);
    return { meetings, total };
  },

  async deleteMeeting(adminId, id, ipAddress = null) {
    const existing = await meetingModel.findById(id);
    if (!existing) {
      throw new AppError(`Meeting with ID ${id} not found`, 404, 'MEETING_NOT_FOUND');
    }

    await meetingModel.delete(id);
    await auditService.log(adminId, 'DELETE_MEETING', 'meetings', id, { deletedTitle: existing.title }, ipAddress);
    return true;
  }
};
