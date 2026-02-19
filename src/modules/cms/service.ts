import CmsModel, { CmsDocument } from './model';

interface CmsPayload {
  key: 'terms' | 'privacy' | 'about';
  title: string;
  content: string;
}

type CmsKey = CmsPayload['key'];

const CMS_TITLES: Record<CmsKey, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  about: 'About Us'
};

export const upsertContent = (key: CmsPayload['key'], payload: CmsPayload): Promise<CmsDocument> => {
  return CmsModel.findOneAndUpdate({ key }, { ...payload, key }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

export const getContent = (key: CmsPayload['key']): Promise<CmsDocument | null> => {
  return CmsModel.findOne({ key });
};

export const listContent = (): Promise<CmsDocument[]> => {
  return CmsModel.find();
};

export const updateTextByKey = async (key: CmsKey, text: string): Promise<CmsDocument> => {
  const existing = await CmsModel.findOne({ key });
  const title = existing?.title || CMS_TITLES[key];
  return CmsModel.findOneAndUpdate(
    { key },
    { key, title, content: text },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
