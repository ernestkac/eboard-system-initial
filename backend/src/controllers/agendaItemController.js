import { agendaItemModel } from '../models/agendaItemModel.js';
import { meetingModel } from '../models/meetingModel.js';
import { auditService } from '../services/auditService.js';
import { successResponse, AppError } from '../utils/responseHandler.js';

export const agendaItemController = {
  /**
   * POST /api/agenda-items
   * Officer or Admin - FR-2.2
   */
  async createAgendaItem(req, res, next) {
    try {
      const { meetingId, title, description, orderNum } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const meeting = await meetingModel.findById(meetingId);
      if (!meeting) {
        throw new AppError(`Meeting with ID ${meetingId} not found`, 404, 'MEETING_NOT_FOUND');
      }

      const order = orderNum !== undefined ? orderNum : await agendaItemModel.getNextOrderNum(meetingId);
      const itemId = await agendaItemModel.create({
        meetingId,
        title,
        description,
        orderNum: order,
        createdBy: req.user.id
      });

      await auditService.log(
        req.user.id,
        'CREATE_AGENDA_ITEM',
        'agenda_items',
        itemId,
        { meetingId, title, orderNum: order },
        ipAddress
      );

      const item = await agendaItemModel.findById(itemId);
      return successResponse(res, 201, 'Agenda item added successfully', item);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/agenda-items/:id
   * Officer or Admin - FR-2.2
   */
  async updateAgendaItem(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, orderNum, status } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const existing = await agendaItemModel.findById(id);
      if (!existing) {
        throw new AppError(`Agenda item with ID ${id} not found`, 404, 'AGENDA_ITEM_NOT_FOUND');
      }

      await agendaItemModel.update(id, {
        title,
        description,
        orderNum,
        status,
        updatedBy: req.user.id
      });

      await auditService.log(
        req.user.id,
        'UPDATE_AGENDA_ITEM',
        'agenda_items',
        id,
        { title, orderNum, status },
        ipAddress
      );

      const item = await agendaItemModel.findById(id);
      return successResponse(res, 200, 'Agenda item updated successfully', item);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/agenda-items/reorder
   * Officer or Admin - FR-2.2
   * Payload: { meetingId, items: [{ id: 1, orderNum: 1 }, { id: 2, orderNum: 2 }] }
   */
  async reorderAgendaItems(req, res, next) {
    try {
      const { meetingId, items } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('An array of items with id and orderNum is required', 400, 'INVALID_REORDER_PAYLOAD');
      }

      await agendaItemModel.reorder(meetingId, items, req.user.id);
      await auditService.log(
        req.user.id,
        'REORDER_AGENDA_ITEMS',
        'agenda_items',
        meetingId,
        { itemCount: items.length },
        ipAddress
      );

      const updatedList = await agendaItemModel.findByMeetingId(meetingId);
      return successResponse(res, 200, 'Agenda items reordered successfully', updatedList);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/agenda-items/meeting/:meetingId
   */
  async getByMeetingId(req, res, next) {
    try {
      const { meetingId } = req.params;
      const items = await agendaItemModel.findByMeetingId(meetingId);
      return successResponse(res, 200, 'Agenda items retrieved', items);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/agenda-items/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await agendaItemModel.findById(id);
      if (!item) {
        throw new AppError(`Agenda item with ID ${id} not found`, 404, 'AGENDA_ITEM_NOT_FOUND');
      }
      return successResponse(res, 200, 'Agenda item retrieved', item);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/agenda-items/:id
   * Admin or Officer
   */
  async deleteAgendaItem(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const existing = await agendaItemModel.findById(id);
      if (!existing) {
        throw new AppError(`Agenda item with ID ${id} not found`, 404, 'AGENDA_ITEM_NOT_FOUND');
      }

      await agendaItemModel.delete(id);
      await auditService.log(req.user.id, 'DELETE_AGENDA_ITEM', 'agenda_items', id, { title: existing.title }, ipAddress);

      return successResponse(res, 200, 'Agenda item deleted successfully', { id });
    } catch (error) {
      next(error);
    }
  }
};
