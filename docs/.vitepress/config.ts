import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'API', link: '/api/' },
      { text: 'SDK', link: '/sdk/' }
    ],

    sidebar: {
      '/api/': [
        {
          text: 'API',
          items: [
            { text: 'Overview', link: '/api/' }
          ]
        }
      ],
      '/sdk/': [
        {
          text: 'SDK',
          items: [
            { text: 'Overview', link: '/sdk/' },
            {
              text: 'Pages',
              collapsed: true,
              items: [
                { text: 'Introduction', link: '/sdk/pages/' }
              ]
            },
            {
              text: 'Storage',
              collapsed: true,
              items: [
                { text: 'Introduction', link: '/sdk/storage/' }
              ]
            },
            {
              text: 'Database',
              collapsed: true,
              items: [
                { text: 'Introduction', link: '/sdk/database/' }
              ]
            }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
