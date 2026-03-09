import mongoose, { Document, Schema } from 'mongoose';

export interface CustomFoodDocument extends Document {
  user: mongoose.Types.ObjectId;
  barcode?: string;
  foodName?: string;
  brandName?: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFoodSchema = new Schema<CustomFoodDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    barcode: { type: String, trim: true },
    foodName: { type: String, trim: true, default: '' },
    brandName: { type: String, trim: true, default: '' },
    servingSize: { type: String, trim: true, default: '' },
    calories: { type: Number, min: 0, default: 0 },
    protein: { type: Number, min: 0, default: 0 },
    carbs: { type: Number, min: 0, default: 0 },
    fat: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

CustomFoodSchema.index({ user: 1, createdAt: -1 });
CustomFoodSchema.index({ user: 1, barcode: 1 }, { unique: true, sparse: true });

const CustomFoodModel = mongoose.model<CustomFoodDocument>('CustomFood', CustomFoodSchema);

export default CustomFoodModel;
