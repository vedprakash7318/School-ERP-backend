import { SubscriptionPlan, SchoolSubscription, School } from '../models/index.js';

// Super Admin: List all subscription plans
export const getAllPlans = async (req, res, next) => {
  try {
    const plansDocs = await SubscriptionPlan.find().sort({ price: 1 }).lean();

    const plans = await Promise.all(
      plansDocs.map(async (plan) => {
        const subCount = await SchoolSubscription.countDocuments({ plan: plan._id });
        return {
          ...plan,
          id: plan._id.toString(),
          _count: { subscriptions: subCount },
        };
      })
    );

    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Create a new Subscription Plan
export const createPlan = async (req, res, next) => {
  try {
    const { name, billingCycle, price, durationDays, description, maxStudents, maxStaff } = req.body;

    if (!name || !billingCycle || price === undefined || !durationDays) {
      return res.status(400).json({
        success: false,
        message: 'Name, billingCycle, price, and durationDays are required.',
      });
    }

    const validCycles = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (!validCycles.includes(billingCycle.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `billingCycle must be one of: ${validCycles.join(', ')}`,
      });
    }

    const newPlan = await SubscriptionPlan.create({
      name,
      billingCycle: billingCycle.toUpperCase(),
      price: parseFloat(price),
      durationDays: parseInt(durationDays),
      description: description || '',
      maxStudents: maxStudents ? parseInt(maxStudents) : 1000,
      maxStaff: maxStaff ? parseInt(maxStaff) : 100,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: newPlan,
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Update a Subscription Plan
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, billingCycle, price, durationDays, description, maxStudents, maxStaff, isActive } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (billingCycle) dataToUpdate.billingCycle = billingCycle.toUpperCase();
    if (price !== undefined) dataToUpdate.price = parseFloat(price);
    if (durationDays) dataToUpdate.durationDays = parseInt(durationDays);
    if (description !== undefined) dataToUpdate.description = description;
    if (maxStudents) dataToUpdate.maxStudents = parseInt(maxStudents);
    if (maxStaff) dataToUpdate.maxStaff = parseInt(maxStaff);
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const updated = await SubscriptionPlan.findByIdAndUpdate(id, dataToUpdate, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Delete Plan
export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    await SubscriptionPlan.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Assign/Renew Subscription to a School
export const assignSubscription = async (req, res, next) => {
  try {
    const { schoolId, planId, paymentStatus, notes } = req.body;

    if (!schoolId || !planId) {
      return res.status(400).json({ success: false, message: 'School ID and Plan ID are required' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    const subscription = await SchoolSubscription.create({
      school: schoolId,
      plan: planId,
      startDate,
      endDate,
      status: 'ACTIVE',
      paymentStatus: paymentStatus || 'PAID',
      amountPaid: plan.price,
      notes: notes || `Assigned ${plan.name} (${plan.billingCycle})`,
    });

    const populated = await SchoolSubscription.findById(subscription._id)
      .populate('plan')
      .populate('school', 'name code');

    res.status(201).json({
      success: true,
      message: `Subscription successfully assigned to school. Active until ${endDate.toDateString()}`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Get all subscription transactions / history
export const getSubscriptionHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await SchoolSubscription.countDocuments();
    const subscriptions = await SchoolSubscription.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('school', 'name code')
      .populate('plan');

    res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
