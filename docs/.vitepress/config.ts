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
                { text: 'Introduction', link: '/sdk/pages/' },
                { text: 'XML Pages', link: '/sdk/pages/xml' },
                { text: 'HTML Elements', link: '/sdk/pages/html-elements' },
                {
                  text: 'Layout',
                  collapsed: true,
                  items: [
                    { text: 'Hero', link: '/sdk/pages/layout/hero' },
                    { text: 'Menu', link: '/sdk/pages/layout/menu' },
                    { text: 'Card', link: '/sdk/pages/layout/card' },
                    { text: 'Columns', link: '/sdk/pages/layout/columns' },
                    { text: 'Tabs', link: '/sdk/pages/layout/tabs' },
                    { text: 'Table', link: '/sdk/pages/layout/table' }
                  ]
                },
                {
                  text: 'Components',
                  collapsed: true,
                  items: [
                    { text: 'Button', link: '/sdk/pages/components/button' },
                    { text: 'Checkbox', link: '/sdk/pages/components/checkbox' },
                    { text: 'Dialog', link: '/sdk/pages/components/dialog' },
                    { text: 'Icon', link: '/sdk/pages/components/icon' },
                    { text: 'Input', link: '/sdk/pages/components/input' },
                    { text: 'Range', link: '/sdk/pages/components/range' },
                    { text: 'Select', link: '/sdk/pages/components/select' },
                    { text: 'Separator', link: '/sdk/pages/components/separator' },
                    { text: 'Slider', link: '/sdk/pages/components/slider' },
                    { text: 'Switch', link: '/sdk/pages/components/switch' },
                    { text: 'Textarea', link: '/sdk/pages/components/textarea' }
                  ]
                }
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
