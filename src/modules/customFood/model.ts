import mongoose, { Document, Schema } from 'mongoose';

export interface CustomFoodDocument extends Document {
  user: mongoose.Types.ObjectId;
  barcode?: string;
  foodName: string;
  brandName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFoodSchema = new Schema<CustomFoodDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    barcode: { type: String, trim: true },
    foodName: { type: String, required: true, trim: true },
    brandName: { type: String, required: true, trim: true },
    servingSize: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

CustomFoodSchema.index({ user: 1, createdAt: -1 });
CustomFoodSchema.index({ user: 1, barcode: 1 }, { unique: true, sparse: true });

const CustomFoodModel = mongoose.model<CustomFoodDocument>('CustomFood', CustomFoodSchema);

export default CustomFoodModel;
