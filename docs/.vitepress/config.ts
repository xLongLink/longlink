import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/banner.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/banner.png' }]
  ],
  themeConfig: {
    logo: '/banner.png',
    logoLink: 'https://longlink.dev',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Control Plane', link: '/api/' },
      { text: 'Applications SDK', link: '/sdk/' }
    ],

    sidebar: {
      '/api/': [
        {
          text: 'Control Plane',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Organization', link: '/api/organization/' },
            { text: 'Permissions', link: '/api/permissions/' },
            { text: 'Applications', link: '/api/applications/' },
            { text: 'Databases', link: '/api/databases/' },
            { text: 'Storage', link: '/api/storage/' },
            { text: 'Compute', link: '/api/compute/' },
            { text: 'Logging', link: '/api/logging/' },
            { text: 'Integrations', link: '/api/integrations/' }
          ]
        }
      ],
      '/sdk/': [
        {
          text: 'Applications SDK',
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
      { icon: 'github', link: 'https://github.com/xLongLink/longlink' }
    ]
  }
})
