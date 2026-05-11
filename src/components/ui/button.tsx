'use client'

import { Button as BaseButton } from '@base-ui/react/button'
import { m } from 'motion/react'
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/src/lib/utils'

type ButtonVariant = 'default'
type ButtonSize = 'default' | 'icon'
type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>
const buttonScaleTransition = {
	type: 'spring',
	stiffness: 420,
	damping: 28,
	mass: 0.9,
} as const

export type ButtonProps = Omit<BaseButtonProps, 'children'> & {
	icon?: ReactNode
	children?: ReactNode
	className?: string
	variant?: ButtonVariant
	size?: ButtonSize
}

export const Button = forwardRef<ElementRef<typeof BaseButton>, ButtonProps>(function Button(
	{
		className,
		children,
		icon,
		variant = 'default',
		size,
		type = 'button',
		disabled,
		...props
	}: ButtonProps,
	ref
) {
	const hasLabel = children !== undefined && children !== null

	return (
		<m.span
			className='inline-flex'
			whileHover={disabled ? undefined : { scale: 1.04 }}
			whileTap={disabled ? undefined : { scale: 0.94 }}
			transition={buttonScaleTransition}>
			<BaseButton
				ref={ref}
				type={type}
				disabled={disabled}
				className={getButtonClassName({
					variant,
					size,
					hasLabel,
					className,
				})}
				{...props}>
				{icon ? (
					<span
						aria-hidden='true'
						className='flex shrink-0 items-center justify-center text-current'>
						{icon}
					</span>
				) : null}
				{hasLabel ? <span className='truncate'>{children}</span> : null}
			</BaseButton>
		</m.span>
	)
})

export default Button

const variantStyles: Record<ButtonVariant, string> = {
	default:
		'border border-white/5 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800/75 hover:text-neutral-300 focus-visible:border-white/20 focus-visible:outline-none',
}

const sizeStyles: Record<ButtonSize, string> = {
	default: 'h-9 px-4 py-2',
	icon: 'h-9 w-9 p-0',
}

interface ButtonClassNameOptions {
	variant?: ButtonVariant
	size?: ButtonSize
	hasLabel?: boolean
	className?: string
}

export function getButtonClassName({
	variant = 'default',
	size,
	hasLabel = true,
	className,
}: ButtonClassNameOptions = {}) {
	const variantClassName = variantStyles[variant]
	const sizeClassName = size ? sizeStyles[size] : hasLabel ? 'h-9 gap-2 px-4' : 'size-9 p-0'

	return cn(
		'inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-xs backdrop-blur-[10px] cursor-default transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		variantClassName,
		sizeClassName,
		className
	)
}
