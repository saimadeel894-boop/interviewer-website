import Task from '../models/Task.js';
import User from '../models/User.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';
import { logActivity } from '../utils/activity.js';
import { createNotification } from '../utils/notifications.js';
import { recalculatePerformance } from '../utils/performance.js';

const allowedStatuses = ['assigned', 'in_progress', 'completed', 'failed'];
const developerTransitions = {
  assigned: ['in_progress'],
  in_progress: ['completed', 'failed'],
  completed: [],
  failed: []
};

const populateTask = (query) => query
  .populate('assignedTo', 'name email role avatar')
  .populate('createdBy', 'name email role avatar');

const ensureTaskAccess = (req, task) => {
  const isOwner = req.user.role === 'owner';
  const isAssignedDeveloper = req.user.role === 'developer' && task.assignedTo._id.equals(req.user._id);

  if (!isOwner && !isAssignedDeveloper) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

export const createTask = async (req, res) => {
  const { title, description, deadline, assignedTo } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({ message: 'Title and assigned developer are required' });
  }

  const developer = await User.findById(assignedTo);
  if (!developer || developer.role !== 'developer') {
    return res.status(400).json({ message: 'Task can only be assigned to a developer' });
  }

  const task = await Task.create({
    title,
    description,
    deadline,
    assignedTo,
    createdBy: req.user._id,
    statusHistory: [{ status: 'assigned', updatedAt: new Date() }]
  });

  await logActivity(req.user._id, `Created task ${task.title}`, 'task', task._id);
  await createNotification(req.app.get('io'), developer._id, `New task assigned: ${task.title}`, 'task');
  await recalculatePerformance(developer._id);

  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json(populated);
};

export const listTasks = async (req, res) => {
  if (!['owner', 'developer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const query = req.user.role === 'owner' ? {} : { assignedTo: req.user._id };
  if (req.query.status && allowedStatuses.includes(req.query.status)) {
    query.status = req.query.status;
  }

  const tasks = await populateTask(Task.find(query)).sort({ createdAt: -1 });
  res.json(tasks);
};

export const getTask = async (req, res) => {
  const task = await populateTask(Task.findById(req.params.id));

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  ensureTaskAccess(req, task);
  res.json(task);
};

export const updateTask = async (req, res) => {
  const allowed = ['title', 'description', 'deadline'];
  const updates = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const task = await populateTask(Task.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }));

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  await logActivity(req.user._id, `Updated task ${task.title}`, 'task', task._id);
  res.json(task);
};

export const updateTaskStatus = async (req, res) => {
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid task status' });
  }

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (req.user.role === 'developer') {
    if (!task.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned developer can update this task' });
    }

    if (!developerTransitions[task.status].includes(status)) {
      return res.status(400).json({ message: `Cannot move task from ${task.status} to ${status}` });
    }
  } else if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  task.status = status;
  task.statusHistory.push({ status, updatedAt: new Date() });
  await task.save();

  await logActivity(req.user._id, `Updated task ${task._id} to ${status}`, 'task', task._id);
  await recalculatePerformance(task.assignedTo);

  const populated = await populateTask(Task.findById(task._id));
  res.json(populated);
};

export const uploadTaskFile = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (req.user.role !== 'developer' || !task.assignedTo.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the assigned developer can upload task files' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }

  const fileUrl = await uploadBufferToCloudinary(req.file, 'workforce-platform/tasks');
  task.fileUploads.push(fileUrl);
  await task.save();

  await logActivity(req.user._id, `Uploaded file for task ${task._id}`, 'task', task._id);
  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json(populated);
};

export const deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  await logActivity(req.user._id, `Deleted task ${task.title}`, 'task', task._id);
  await recalculatePerformance(task.assignedTo);
  res.json({ message: 'Task deleted' });
};
