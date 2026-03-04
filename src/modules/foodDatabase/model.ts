import mongoose, { Document, Schema } from 'mongoose';

export const FOOD_SERVING_UNITS = ['g', 'ml', 'piece'] as const;
export type FoodServingUnit = (typeof FOOD_SERVING_UNITS)[number];

export interface FoodDatabaseDocument extends Document {
  brand: string;
  product: string;
  servingSize: number;
  servingUnit: FoodServingUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FoodDatabaseSchema = new Schema<FoodDatabaseDocument>(
  {
    brand: { type: String, required: true, trim: true, index: true },
    product: { type: String, required: true, trim: true, index: true },
    servingSize: { type: Number, required: true, min: 0.01 },
    servingUnit: { type: String, enum: FOOD_SERVING_UNITS, required: true, default: 'g' },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    barcode: { type: String, trim: true, sparse: true, index: true }
  },
  { timestamps: true }
);

FoodDatabaseSchema.index({ brand: 1, product: 1 });

const FoodDatabaseModel = mongoose.model<FoodDatabaseDocument>('FoodDatabase', FoodDatabaseSchema);

export default FoodDatabaseModel;
