"use client";

import { m } from "motion/react";
import { CloseIcon } from "@/src/components/icons/close";
import { GithubIcon } from "@/src/components/icons/github";
import { InfoIcon } from "@/src/components/icons/info";
import { Button, getButtonClassName } from "@/src/components/ui/button";

interface TopLeftActionsProps {
	isInfoOpen: boolean;
	onToggleInfo: () => void;
}

const buttonScaleTransition = {
	type: "spring",
	stiffness: 420,
	damping: 28,
	mass: 0.9,
} as const;

export default function TopLeftActions({
	isInfoOpen,
	onToggleInfo,
}: TopLeftActionsProps) {
	return (
		<div className="fixed top-5 left-5 z-20 flex items-center gap-1">
			<Button
				aria-label={isInfoOpen ? "Hide info" : "Show info"}
				aria-pressed={isInfoOpen}
				onClick={onToggleInfo}
				size="icon"
				icon={
					isInfoOpen ? (
						<CloseIcon className="size-4" aria-hidden="true" />
					) : (
						<InfoIcon className="size-4" aria-hidden="true" />
					)
				}
			/>

			<m.a
				href="https://github.com/ycparak/gaussian-splatter"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Open GitHub repository"
				whileHover={{ scale: 1.04 }}
				whileTap={{ scale: 0.94 }}
				transition={buttonScaleTransition}
				className={getButtonClassName({ size: "icon", hasLabel: false })}
			>
				<GithubIcon className="size-4" aria-hidden="true" />
			</m.a>
		</div>
	);
}
