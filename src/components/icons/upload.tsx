import { forwardRef } from 'react'

import { IconBase, type IconProps } from './icon-base'

export const UploadIcon = forwardRef<SVGSVGElement, IconProps>(function UploadIcon(props, ref) {
	return (
		<IconBase ref={ref} {...props}>
			<path
				d='M20 14.75V17C20 18.6569 18.6569 20 17 20H7C5.34315 20 4 18.6569 4 17V14.75M12 4V15.25M12 4L16.5 8.5M12 4L7.5 8.5'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</IconBase>
	)
})

UploadIcon.displayName = 'UploadIcon'
