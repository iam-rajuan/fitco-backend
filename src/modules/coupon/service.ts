import CouponModel, { CouponDocument } from './model';

interface CouponPayload {
  code: string;
  discountPercentage: number;
  expiryDate: string;
  isActive?: boolean;
}

export const createCoupon = async (data: CouponPayload): Promise<CouponDocument> => {
  const payload = { ...data, code: data.code.toUpperCase() };
  const existingCoupons = await CouponModel.find().sort({ createdAt: -1 });

  if (existingCoupons.length > 0) {
    const primary = existingCoupons[0];
    if (existingCoupons.length > 1) {
      await CouponModel.deleteMany({ _id: { $ne: primary._id } });
    }
    primary.code = payload.code;
    primary.discountPercentage = payload.discountPercentage;
    primary.expiryDate = new Date(payload.expiryDate);
    primary.isActive = payload.isActive ?? true;
    await primary.save();

    return primary;
  }

  return CouponModel.create(payload);
};

export const updateCoupon = (id: string, data: Partial<CouponPayload>): Promise<CouponDocument | null> => {
  const payload = { ...data };
  if (payload.code) {
    payload.code = payload.code.toUpperCase();
  }
  return CouponModel.findByIdAndUpdate(id, payload, { new: true });
};

export const toggleCoupon = (id: string, isActive: boolean): Promise<CouponDocument | null> => {
  return CouponModel.findByIdAndUpdate(id, { isActive }, { new: true });
};

export const listCoupons = (): Promise<CouponDocument[]> => {
  return CouponModel.find().sort({ createdAt: -1 });
};

export const getCouponByCode = (code: string): Promise<CouponDocument | null> => {
  return CouponModel.findOne({ code: code.toUpperCase(), isActive: true, expiryDate: { $gt: new Date() } });
};

export const deleteCoupon = (id: string): Promise<void> => {
  return CouponModel.findByIdAndDelete(id).then(() => undefined);
};
