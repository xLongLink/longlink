import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Control Plane', link: '/' },
      { text: 'Applications SDK', link: '/api-examples' }
    ],

    sidebar: [
      {
        text: 'Control Plane',
        items: [
          { text: 'Overview', link: '/' }
        ]
      },
      {
        text: 'Applications SDK',
        items: [
          { text: 'Runtime API Examples', link: '/api-examples' },
          { text: 'Markdown Examples', link: '/markdown-examples' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
