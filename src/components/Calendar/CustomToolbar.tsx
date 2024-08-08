// Copyright 2019-2025 @polkassembly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { DownOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Space } from 'antd';
import { Dropdown } from '~src/ui-components/Dropdown';
import { dayjs } from 'dayjs-init';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

import calendar_today from '~assets/calendar_today.png';

import NetworkSelect from './NetworkSelect';
import { useTheme } from 'next-themes';
import CustomButton from '~src/basic-components/buttons/CustomButton';
import Tooltip from '~src/basic-components/Tooltip';

function CustomToolbar(props: any) {
	const { resolvedTheme: theme } = useTheme();
	let months: MenuProps['items'] = [
		{ key: '0', label: 'January' },
		{ key: '1', label: 'February' },
		{ key: '2', label: 'March' },
		{ key: '3', label: 'April' },
		{ key: '4', label: 'May' },
		{ key: '5', label: 'June' },
		{ key: '6', label: 'July' },
		{ key: '7', label: 'August' },
		{ key: '8', label: 'September' },
		{ key: '9', label: 'October' },
		{ key: '10', label: 'November' },
		{ key: '11', label: 'December' }
	];

	const viewStateOptions: MenuProps['items'] = [
		{ key: 'month', label: 'Month' },
		{ key: 'week', label: 'Week' },
		{ key: 'day', label: 'Day' },
		{ key: 'agenda', label: 'Agenda' }
	];

	if (props.small) {
		months = [
			{ key: '0', label: 'Jan' },
			{ key: '1', label: 'Feb' },
			{ key: '2', label: 'Mar' },
			{ key: '3', label: 'Apr' },
			{ key: '4', label: 'May' },
			{ key: '5', label: 'Jun' },
			{ key: '6', label: 'Jul' },
			{ key: '7', label: 'Aug' },
			{ key: '8', label: 'Sep' },
			{ key: '9', label: 'Oct' },
			{ key: '10', label: 'Nov' },
			{ key: '11', label: 'Dec' }
		];
	}

	const [viewState, setViewState] = useState<string>('month');
	const [selectedMonth, setSelectedMonth] = useState<number>(props.date.getMonth());

	function addMonths(date: any, months: any) {
		const d = date.getDate();
		date.setMonth(date.getMonth() + months);
		if (date.getDate() != d) {
			date.setDate(0);
		}

		setSelectedMonth(date.getMonth());
		return date;
	}

	function addWeeks(date: any, weeks: any) {
		date.setDate(date.getDate() + 7 * weeks);
		setSelectedMonth(date.getMonth());
		return date;
	}

	function addDays(date: any, days: any) {
		date.setDate(date.getDate() + days);
		setSelectedMonth(date.getMonth());
		return date;
	}

	const goToBack = () => {
		if (viewState === 'month' || viewState === 'agenda') {
			props.onNavigate('prev', addMonths(props.date, -1));
		} else if (viewState === 'week') {
			props.onNavigate('prev', addWeeks(props.date, -1));
		} else {
			props.onNavigate('prev', addDays(props.date, -1));
		}
	};

	const goToNext = () => {
		if (viewState === 'month' || viewState === 'agenda') {
			props.onNavigate('next', addMonths(props.date, +1));
		} else if (viewState === 'week') {
			props.onNavigate('next', addWeeks(props.date, +1));
		} else {
			props.onNavigate('next', addDays(props.date, +1));
		}
	};

	const goToToday = () => {
		const now = new Date();
		props.date.setMonth(now.getMonth());
		props.date.setYear(now.getFullYear());
		props.date.setDate(now.getDate());
		setSelectedMonth(now.getMonth());
		props.setMiniCalendarToToday();
		props.onNavigate('current');
	};

	const onSelectMonthChange: MenuProps['onClick'] = ({ key }) => {
		setSelectedMonth(Number(key));
		const now = new Date();
		props.date.setMonth(key);
		props.date.setYear(now.getFullYear());
		props.date.setDate(now.getDate());
		props.onNavigate('current');
	};

	const onViewStateChange: MenuProps['onClick'] = ({ key }) => {
		setViewState(`${key}`);
		props.onView(`${key}`);
	};

	useEffect(() => {
		setSelectedMonth(props.date.getMonth());
		const now = new Date();
		props.date.setMonth(props.date.getMonth());
		props.date.setYear(now.getFullYear());
		props.onNavigate('current');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setViewState(`${props.view}`);
	}, [props.view]);

	function createEventButton(disabled: boolean = false) {
		return (
			<div>
				<CustomButton
					variant='primary'
					disabled={disabled}
					onClick={() => {
						if (!disabled) props.setSidebarCreateEvent(true);
					}}
					className='ml-2 rounded-md border-pink_primary text-white'
					buttonsize='xs'
					text='Create Event'
				/>
			</div>
		);
	}

	return (
		props.date && (
			<>
				{!props.small && !(props.width < 768) ? (
					<div
						className={`custom-calendar-toolbar ${props.small || props.width < 768 ? 'small' : ''}`}
						style={{ marginLeft: !props.small && !(props.width <= 991) ? props.leftPanelWidth && -props.leftPanelWidth : 0 }}
					>
						<NetworkSelect
							selectedNetwork={props.selectedNetwork}
							setSelectedNetwork={props.setSelectedNetwork}
						/>
						<div className='select-div'>
							<label>Type</label>
							<Dropdown
								theme={theme}
								overlayClassName='z-[1056]'
								trigger={['click']}
								menu={{ items: viewStateOptions, onClick: onViewStateChange }}
							>
								<Space className='mt-1 cursor-pointer capitalize text-pink_primary'>
									{viewState}
									<DownOutlined className='align-middle text-pink_primary' />
								</Space>
							</Dropdown>
						</div>
						<div className='flex items-center'>
							<span className='text-md ml-5 mr-5 w-[130px] text-sidebarBlue dark:text-white md:text-lg'>{dayjs(props.date).format('MMMM YYYY')}</span>
							<LeftOutlined
								onClick={goToBack}
								className='mr-3 cursor-pointer text-sm hover:font-semibold hover:text-sidebarBlue'
							/>
							<RightOutlined
								onClick={goToNext}
								className='md:text-md cursor-pointer text-sm hover:font-semibold hover:text-sidebarBlue'
							/>
						</div>

						<div className='ml-auto flex items-center'>
							<CustomButton
								text='Today'
								className='border-white dark:bg-section-dark-overlay dark:text-white'
								onClick={goToToday}
								buttonsize='xs'
								variant='default'
							/>

							{!props.isLoggedIn ? (
								<Tooltip
									color='#ef5a19'
									title='Please login to create an event'
									placement='top'
								>
									{createEventButton(true)}
								</Tooltip>
							) : (
								createEventButton()
							)}
						</div>
					</div>
				) : (
					<>
						<div
							className={`custom-calendar-toolbar ${props.small || props.width < 768 ? 'small' : ''}`}
							style={!props.small && !(props.width <= 991) ? { marginLeft: -props.leftPanelWidth } : { marginLeft: 0 }}
						>
							<div className='flex'>
								<Dropdown
									theme={theme}
									overlayClassName='z-[1056]'
									trigger={['click']}
									className='select-month-dropdown'
									menu={{ items: months, onClick: onSelectMonthChange }}
								>
									<Space className='cursor-pointer capitalize text-pink_primary'>
										{selectedMonth}
										<DownOutlined className='align-middle text-pink_primary' />
									</Space>
								</Dropdown>

								<div className='mx-1 flex'>
									<LeftOutlined
										onClick={goToBack}
										className='mr-2 cursor-pointer text-sm hover:font-semibold hover:text-sidebarBlue'
									/>
									<RightOutlined
										onClick={goToNext}
										className='cursor-pointer text-sm hover:font-semibold hover:text-sidebarBlue'
									/>
								</div>
							</div>

							<span className='year-text'>{dayjs(props.date).format('YYYY')}</span>

							<div className='actions-right'>
								<Image
									className='today-btn-img'
									onClick={goToToday}
									src={calendar_today}
									height={16}
									width={16}
									title='Today'
									alt='Today'
								/>
								<Dropdown
									theme={theme}
									overlayClassName='z-[1056]'
									trigger={['click']}
									className='select-view-dropdown'
									menu={{ items: viewStateOptions, onClick: onViewStateChange }}
								>
									<Space className='cursor-pointer capitalize text-pink_primary'>
										{viewState}
										<DownOutlined className='align-middle text-pink_primary' />
									</Space>
								</Dropdown>
							</div>
						</div>
						<div className='flex w-full justify-end'>
							{!props.small ? (
								!props.isLoggedIn ? (
									<Tooltip
										color='#ef5a19'
										title='Please login to create an event'
										placement='top'
									>
										{createEventButton(true)}
									</Tooltip>
								) : (
									createEventButton()
								)
							) : null}
						</div>
					</>
				)}
			</>
		)
	);
}

export default CustomToolbar;
