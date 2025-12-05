import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { createI18n } from 'vue-i18n'

describe('LanguageSwitcher', () => {
    it('toggles language when clicked', async () => {
        const i18n = createI18n({
            legacy: false,
            locale: 'en',
            messages: {
                en: {},
                fr: {}
            }
        })

        const wrapper = mount(LanguageSwitcher, {
            global: {
                plugins: [i18n]
            }
        })

        expect(wrapper.text()).toContain('🇬🇧')
        expect(wrapper.text()).toContain('en')

        await wrapper.find('button').trigger('click')

        expect(wrapper.text()).toContain('🇫🇷')
        expect(wrapper.text()).toContain('fr')
    })
})
