import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://izrino.github.io',
  base: '/zig-docs',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    starlight({
      title: 'Zig Docs',
      description:
        'Zig 0.17.0 language reference and standard library in Chinese and English.',
      defaultLocale: 'zh-cn',
      disable404Route: true,
      locales: {
        'zh-cn': { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/IZRINO/zig-docs',
        },
      ],
      customCss: ['./src/styles/site.css'],
      components: {
        Head: './src/components/Head.astro',
        Header: './src/components/Header.astro',
        PageTitle: './src/components/PageTitle.astro',
        LanguageSelect: './src/components/LanguageSelect.astro',
        Footer: './src/components/Footer.astro',
        TableOfContents: './src/components/TableOfContents.astro',
        MobileTableOfContents: './src/components/MobileTableOfContents.astro',
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      pagination: false,
      lastUpdated: false,
      credits: false,
      head: [
        { tag: 'meta', attrs: { name: 'theme-color', content: '#cd6927' } },
      ],
    }),
  ],
});
