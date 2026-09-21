import { documentModel } from '../models/documentModel.js';
import { auditService } from './auditService.js';
import { AppError } from '../utils/responseHandler.js';

export const documentService = {
  async createDocument(userId, { title, description, linkOrReference, category = 'general', meetingId = null }, ipAddress = null) {
    const id = await documentModel.create({
      title,
      description,
      linkOrReference,
      category,
      meetingId,
      createdBy: userId
    });

    await auditService.log(userId, 'CREATE_DOCUMENT', 'documents', id, { title, category, meetingId }, ipAddress);
    return await documentModel.findById(id);
  },

  async updateDocument(userId, id, { title, description, linkOrReference, category, meetingId }, ipAddress = null) {
    const existing = await documentModel.findById(id);
    if (!existing) {
      throw new AppError(`Document entry with ID ${id} not found`, 404, 'DOCUMENT_NOT_FOUND');
    }

    await documentModel.update(id, {
      title,
      description,
      linkOrReference,
      category,
      meetingId,
      updatedBy: userId
    });

    await auditService.log(userId, 'UPDATE_DOCUMENT', 'documents', id, { title, category }, ipAddress);
    return await documentModel.findById(id);
  },

  async deleteDocument(userId, id, ipAddress = null) {
    const existing = await documentModel.findById(id);
    if (!existing) {
      throw new AppError(`Document entry with ID ${id} not found`, 404, 'DOCUMENT_NOT_FOUND');
    }

    await documentModel.delete(id);
    await auditService.log(userId, 'DELETE_DOCUMENT', 'documents', id, { title: existing.title }, ipAddress);
    return true;
  },

  async listDocuments(filters) {
    const documents = await documentModel.findAll(filters);
    const total = await documentModel.countAll(filters);
    return { documents, total };
  },

  async getDocumentById(id) {
    const item = await documentModel.findById(id);
    if (!item) {
      throw new AppError(`Document entry with ID ${id} not found`, 404, 'DOCUMENT_NOT_FOUND');
    }
    return item;
  }
};
