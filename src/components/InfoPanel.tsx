'use client'

import { m } from 'motion/react'
import { useEffect } from 'react'

interface InfoPanelProps {
	onRequestClose: () => void
}

const variants = {
	initial: {
		opacity: 0,
		scale: 0.5,
		filter: 'blur(8px)',
	},

	animate: {
		opacity: 1,
		scale: 1,
		filter: 'blur(0px)',
		transition: {
			type: 'spring' as const,
			bounce: 0.2,
			duration: 1,
		},
	},

	exit: {
		opacity: 0,
		scale: 0.65,
		filter: 'blur(8px)',
		transition: {
			duration: 0.4,
			ease: 'easeIn' as const,
		},
	},
}

export default function InfoPanel({ onRequestClose }: InfoPanelProps) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') return
			onRequestClose()
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [onRequestClose])

	return (
		<m.div
			key='info-panel'
			variants={variants}
			initial='initial'
			animate='animate'
			exit='exit'
			onClick={event => {
				if (event.target instanceof Element && event.target.closest('a')) return
				onRequestClose()
			}}
			className='pointer-events-auto fixed inset-0 z-10 flex items-center justify-center px-6 text-center will-change-transform'>
			<p className='max-w-[256px] text-xs leading-4 font-semibold text-neutral-400 cursor-default text-balance'>
				A browser based particle generator that takes an image and outputs a gaussian splat using
				Apple's ML SHARP, Three.js &amp; GPGPU.
				<br />
				Crafted with love, by{' '}
				<a
					href='https://yusufparak.com'
					target='_blank'
					rel='noreferrer'
					className='text-neutral-300 transition-colors hover:text-white cursor-default focus-visible:ring-0 focus-visible:outline-none focus-visible:text-white'>
					Yusuf Parak
				</a>
				.
			</p>
		</m.div>
	)
}
