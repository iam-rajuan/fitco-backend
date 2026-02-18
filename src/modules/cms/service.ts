import CmsModel, { CmsDocument } from './model';

interface CmsPayload {
  key: 'terms' | 'privacy' | 'about';
  title: string;
  content: string;
}

export const upsertContent = (key: CmsPayload['key'], payload: CmsPayload): Promise<CmsDocument> => {
  return CmsModel.findOneAndUpdate({ key }, { ...payload, key }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

export const getContent = (key: CmsPayload['key']): Promise<CmsDocument | null> => {
  return CmsModel.findOne({ key });
};

export const listContent = (): Promise<CmsDocument[]> => {
  return CmsModel.find();
};