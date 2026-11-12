/* «أعمال العملاء (ستوري)» — the section's starting content until ClearUp sends real logos and works.
   Every client, logo and work here is a clearly-labelled SAMPLE (no real client or brand); the files are
   generic placeholder visuals on the site's Cloudinary (folder clearup/stories-sample), not in this repo.
   The admin replaces them: «أعمال العملاء (ستوري)» → «العملاء وأعمالهم». */
const ls = (ar: string, en: string) => ({ _type: 'localeString', ar, en });
const lt = (ar: string, en: string) => ({ _type: 'localeText', ar, en });

export const SAMPLE_STORY_CLIENTS = [
  {
    _key: 'kcA', _type: 'storyClient', name: ls('عميل تجريبي أ', 'Sample client A'),
    logo: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054981/clearup/stories-sample/logo_A.png', width: 400, height: 400, alt: ls('شعار تجريبي', 'Sample logo') },
    items: [
      { _key: 'ksA1', _type: 'storyItem', caption: ls('هوية بصرية — عمل تجريبي', 'Brand identity — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054985/clearup/stories-sample/work_A_1.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksA2', _type: 'storyItem', caption: ls('منشور سوشال — عمل تجريبي', 'Social post — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054986/clearup/stories-sample/work_A_2.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksA3', _type: 'storyItem', caption: ls('حملة إعلانية — عمل تجريبي', 'Ad campaign — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054987/clearup/stories-sample/work_A_3.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
    ],
  },
  {
    _key: 'kcB', _type: 'storyClient', name: ls('عميل تجريبي ب', 'Sample client B'),
    logo: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054982/clearup/stories-sample/logo_B.png', width: 400, height: 400, alt: ls('شعار تجريبي', 'Sample logo') },
    items: [
      { _key: 'ksB1', _type: 'storyItem', caption: ls('منشور سوشال — عمل تجريبي', 'Social post — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054987/clearup/stories-sample/work_B_1.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksB2', _type: 'storyItem', caption: ls('حملة إعلانية — فيديو تجريبي', 'Ad campaign — sample video'), video: { _type: 'file', url: 'https://res.cloudinary.com/smxxrryc/video/upload/v1794054984/clearup/stories-sample/sample_video_B_2.mp4' } },
      { _key: 'ksB3', _type: 'storyItem', caption: ls('تصميم موقع — عمل تجريبي', 'Web design — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054989/clearup/stories-sample/work_B_3.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksB4', _type: 'storyItem', caption: ls('محتوى ريلز — عمل تجريبي', 'Reels content — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054990/clearup/stories-sample/work_B_4.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
    ],
  },
  {
    _key: 'kcC', _type: 'storyClient', name: ls('عميل تجريبي ج', 'Sample client C'),
    logo: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054982/clearup/stories-sample/logo_C.png', width: 400, height: 400, alt: ls('شعار تجريبي', 'Sample logo') },
    items: [
      { _key: 'ksC1', _type: 'storyItem', caption: ls('حملة إعلانية — عمل تجريبي', 'Ad campaign — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054990/clearup/stories-sample/work_C_1.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksC2', _type: 'storyItem', caption: ls('تصميم موقع — عمل تجريبي', 'Web design — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054991/clearup/stories-sample/work_C_2.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
    ],
  },
  {
    _key: 'kcD', _type: 'storyClient', name: ls('عميل تجريبي د', 'Sample client D'),
    logo: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054983/clearup/stories-sample/logo_D.png', width: 400, height: 400, alt: ls('شعار تجريبي', 'Sample logo') },
    items: [
      { _key: 'ksD1', _type: 'storyItem', caption: ls('تصميم موقع — عمل تجريبي', 'Web design — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054992/clearup/stories-sample/work_D_1.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksD2', _type: 'storyItem', caption: ls('محتوى ريلز — عمل تجريبي', 'Reels content — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054992/clearup/stories-sample/work_D_2.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksD3', _type: 'storyItem', caption: ls('هوية بصرية — عمل تجريبي', 'Brand identity — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054993/clearup/stories-sample/work_D_3.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
    ],
  },
  {
    _key: 'kcE', _type: 'storyClient', name: ls('عميل تجريبي هـ', 'Sample client E'),
    logo: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054983/clearup/stories-sample/logo_E.png', width: 400, height: 400, alt: ls('شعار تجريبي', 'Sample logo') },
    items: [
      { _key: 'ksE1', _type: 'storyItem', caption: ls('محتوى ريلز — عمل تجريبي', 'Reels content — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054994/clearup/stories-sample/work_E_1.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksE2', _type: 'storyItem', caption: ls('هوية بصرية — عمل تجريبي', 'Brand identity — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054995/clearup/stories-sample/work_E_2.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
      { _key: 'ksE3', _type: 'storyItem', caption: ls('منشور سوشال — عمل تجريبي', 'Social post — sample work'), image: { _type: 'image', url: 'https://res.cloudinary.com/smxxrryc/image/upload/v1794054995/clearup/stories-sample/work_E_3.jpg', width: 1080, height: 1920, alt: ls('صورة تجريبية مؤقتة', 'Temporary sample image') } },
    ],
  },
];

/** The section's fields with the sample clients (a fresh copy every call). */
export function sampleClientStories(): Record<string, unknown> {
  return JSON.parse(JSON.stringify({
    index: '',
    eyebrow: ls('أعمال عملائنا', 'Client work'),
    title: ls('شغلنا كما يراه جمهورهم.', 'Our work, the way their audience sees it.'),
    lead: lt('اضغط على شعار أي عميل وتصفّح ما صنعناه معه، تماماً كالستوري.', 'Tap a client’s logo and flip through what we made together, just like stories.'),
    hint: ls('أمثلة مؤقتة — تُستبدل بأعمال العملاء الحقيقية.', 'Temporary samples — to be replaced with real client work.'),
    clients: SAMPLE_STORY_CLIENTS,
  }));
}
