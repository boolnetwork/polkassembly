// Copyright 2019-2025 @polkassembly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.
import React, { FC, useEffect, useState } from 'react';
import Table from '~src/basic-components/Tables/Table';
import { ColumnsType } from 'antd/lib/table';
import StarIcon from '~assets/icons/StarIcon.svg';
import ImageIcon from '~src/ui-components/ImageIcon';
import styled from 'styled-components';
import nextApiClientFetch from '~src/util/nextApiClientFetch';
import { useRouter } from 'next/router';
import { LeaderboardResponse } from 'pages/api/v1/leaderboard';
import ImageComponent from '~src/components/ImageComponent';
import dayjs from 'dayjs';
import NameLabel from '~src/ui-components/NameLabel';
import { useTheme } from 'next-themes';
import DelegateModal from '~src/components/Listing/Tracks/DelegateModal';
import Tipping from '~src/components/Tipping';
import { IleaderboardData } from './types';
import { formatTimestamp } from './utils';
import { useUserDetailsSelector } from '~src/redux/selectors';

const LeaderboardData: FC<IleaderboardData> = ({ className, searchedUsername }) => {
	const { resolvedTheme: theme } = useTheme();
	const [currentPage, setCurrentPage] = useState(1);
	const [address, setAddress] = useState<string>('');
	const [tableData, setTableData] = useState<any>();
	const [totalData, setTotalData] = useState<number>(0);
	const [open, setOpen] = useState<boolean>(false);
	const [openTipping, setOpenTipping] = useState<boolean>(false);
	const [openAddressChangeModal, setOpenAddressChangeModal] = useState<boolean>(false);
	const [tippingUser, setTippingUser] = useState<string>('');
	const [currentUserData, setCurrentUserData] = useState<any>();
	const { username } = useUserDetailsSelector();

	const router = useRouter();

	useEffect(() => {
		if (router.isReady) {
			getLeaderboardData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, router.isReady, searchedUsername]);
	useEffect(() => {
		currentuserData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage]);

	const currentuserData = async () => {
		if (username) {
			const body = { username: username };
			const { data, error } = await nextApiClientFetch<LeaderboardResponse>('api/v1/leaderboard', body);
			if (error) {
				console.error(error);
				return;
			}
			setCurrentUserData(data?.data);
		}
	};

	const currentUserDataSource = currentUserData?.map((item: any, index: number) => ({
		key: item?.user_id,
		profileScore: item?.profile_score,
		rank: currentPage === 1 ? index + 4 : currentPage * 10 + index + 1 - 10,
		user: item?.username,
		userImage: item?.image,
		userSince: formatTimestamp(item?.created_at._seconds)
	}));

	const getLeaderboardData = async () => {
		const body = searchedUsername ? { username: searchedUsername } : { page: currentPage };
		console.log(body);
		const { data, error } = await nextApiClientFetch<LeaderboardResponse>('api/v1/leaderboard', body);
		if (error) {
			console.error(error);
			return;
		}
		console.log(data);
		let modifiedData = data?.data || [];
		if (!searchedUsername && currentPage === 1) {
			modifiedData = modifiedData.slice(3);
		}
		setTableData(modifiedData);
		setTotalData(searchedUsername ? 1 : currentPage === 1 ? 47 : 50);
	};

	const getUserProfile = async (username: string) => {
		const { data, error } = await nextApiClientFetch<any>(`api/v1/auth/data/userProfileWithUsername?username=${username}`);
		if (!data || error) {
			console.log(error);
		}
		if (data) {
			setAddress(data?.addresses[0]);
		}
	};

	const handleTableChange = (pagination: any) => {
		setCurrentPage(pagination.current);
	};

	const columns: ColumnsType<any> = [
		{
			dataIndex: 'rank',
			key: 'rank',
			render: (rank, record) => (
				<p className='m-0 p-0 text-sm text-bodyBlue dark:text-white'>
					{record.user === username ? (
						<ImageIcon
							className='-ml-2'
							src='/assets/icons/CircleWavyQuestion.svg'
							alt=''
						/>
					) : rank < 10 ? (
						`0${rank}`
					) : (
						rank
					)}
				</p>
			),
			title: 'Rank',
			width: 15
		},
		{
			dataIndex: 'user',
			filteredValue: [searchedUsername || ''],
			key: 'user',
			onFilter: (value, record) => {
				return String(record.user).toLocaleLowerCase().includes(String(value).toLowerCase());
			},
			render: (user, userImage) => (
				<div className='flex items-center gap-x-2'>
					<ImageComponent
						src={userImage || ''}
						alt='User Picture'
						className='flex h-[36px] w-[36px] items-center justify-center '
						iconClassName='flex items-center justify-center text-[#FCE5F2] w-full h-full rounded-full'
					/>
					{user === username ? (
						<p className='m-0 p-0'>{username}</p>
					) : (
						<NameLabel
							className={`max-w-[9vw] text-sm text-bodyBlue 2xl:max-w-[12vw] ${user === username ? 'dark:text-bodyBlue' : 'dark:text-white'}`}
							username={user}
							usernameMaxLength={15}
							truncateUsername={false}
							isUsedInLeadership={true}
						/>
					)}
				</div>
			),
			title: 'User',
			width: 250
		},
		{
			dataIndex: 'profileScore',
			key: 'profileScore',
			render: (profileScore) => (
				<div
					className='flex h-7 w-[93px] items-center justify-center gap-x-0.5 rounded-md px-2 py-2'
					style={{ background: 'linear-gradient(0deg, #FFD669 0%, #FFD669 100%), #FCC636' }}
				>
					<StarIcon />
					<p className='m-0 ml-1.5 p-0 text-sm text-[#534930]'>{profileScore}</p>
				</div>
			),
			sorter: (a, b) => a.profileScore - b.profileScore,
			title: 'Profile Score',
			width: 150
		},
		{
			dataIndex: 'userSince',
			key: 'userSince',
			render: (userSince, record) => (
				<div className='flex w-[120px] items-center justify-start gap-x-1'>
					<ImageIcon
						src='/assets/icons/Calendar.svg'
						alt='calenderIcon'
						className='icon-container scale-[0.8]'
					/>
					<p className={`text-bodyBlue ${record.user === username ? 'dark:text-bodyBlue' : 'dark:text-white'} m-0 p-0 text-xs`}>{userSince}</p>
				</div>
			),
			sorter: (a, b) => {
				const timestampA = dayjs(a.userSince, "DD[th] MMM 'YY").unix();
				const timestampB = dayjs(b.userSince, "DD[th] MMM 'YY").unix();
				return timestampA - timestampB;
			},
			title: 'User Since',
			width: 150
		},
		{
			dataIndex: 'auction',
			key: 'auction',
			render: (text, record) => (
				<article>
					{record.user !== username && (
						<div className='flex cursor-pointer items-center justify-start'>
							<div
								onClick={() => {
									getUserProfile(record.user);
									setOpen(true);
								}}
							>
								<ImageIcon
									src={theme === 'dark' ? '/assets/icons/auctionIcons/delegateDarkIcon.svg' : '/assets/icons/auctionIcons/delegateLightIcon.svg'}
									alt='delegation-icon'
									className='icon-container mr-4 cursor-pointer'
								/>
							</div>
							<div
								onClick={() => {
									getUserProfile(record.user);
									setTippingUser(record.user);
									setOpenTipping(true);
								}}
								className='cursor-pointer'
							>
								<ImageIcon
									src={theme === 'dark' ? '/assets/icons/auctionIcons/monetizationDarkIcon.svg' : '/assets/icons/auctionIcons/monetizationLightIcon.svg'}
									alt='monetization-icon'
									className='icon-container mr-4'
								/>
							</div>
							{/* <div className='cursor-not-allowed'>
						<ImageIcon
							src={theme === 'dark' ? '/assets/icons/auctionIcons/BookmarkDark.svg' : '/assets/icons/auctionIcons/BookmarkLight.svg'}
							alt='bookmark-icon'
							className='icon-container cursor-not-allowed opacity-50'
						/>
					</div> */}
						</div>
					)}
				</article>
			),
			title: 'Actions',
			width: 150
		}
	];

	const dataSource = tableData?.map((item: any, index: number) => ({
		key: item?.user_id,
		profileScore: item?.profile_score,
		rank: currentPage === 1 ? index + 4 : currentPage * 10 + index + 1 - 10,
		user: item?.username,
		userImage: item?.image,
		userSince: dayjs(item?.created_at._seconds * 1000).format("DD[th] MMM 'YY")
	}));

	const combinedDataSource = [...(dataSource || []), ...(currentUserDataSource || [])];

	return (
		<div className={theme}>
			{address && (
				<DelegateModal
					// trackNum={trackDetails?.trackId}
					defaultTarget={address}
					open={open}
					setOpen={setOpen}
				/>
			)}
			{address && (
				<Tipping
					username={tippingUser || ''}
					open={openTipping}
					setOpen={setOpenTipping}
					key={address}
					paUsername={tippingUser as any}
					setOpenAddressChangeModal={setOpenAddressChangeModal}
					openAddressChangeModal={openAddressChangeModal}
				/>
			)}
			<Table
				columns={columns}
				className={`${className} w-full overflow-x-auto`}
				dataSource={combinedDataSource}
				pagination={{ pageSize: 11, total: totalData }}
				onChange={handleTableChange}
				theme={theme}
				rowClassName={(record, index) => {
					return index === combinedDataSource.length - 1 ? 'last-row' : '';
				}}
			/>
		</div>
	);
};

export default styled(LeaderboardData)`
	.ant-table-wrapper .ant-table-thead > tr > th,
	.ant-table-wrapper .ant-table-thead > tr > td {
		background: ${(props: any) => (props.theme === 'dark' ? 'black' : 'white')} !important;
	}
	.ant-table-row .ant-table-row-level-0 {
		background: ${(props: any) => (props.theme === 'dark' ? '#1E1E1E' : 'white')} !important;
	}
	.ant-table-thead > tr > th {
		font-size: 14px !important;
		font-style: normal;
		font-weight: 500;
		line-height: 16px;
		letter-spacing: 0.21px;
		color: ${(props: any) => (props.theme === 'dark' ? '#9E9E9E' : '#485F7D')} !important;
	}
	.ant-pagination .ant-pagination-item a {
		color: ${(props: any) => (props.theme === 'dark' ? '#9E9E9E' : 'var(--bodyBlue)')};
	}
	.ant-pagination .ant-pagination-prev button,
	.ant-pagination .ant-pagination-next button {
		color: ${(props: any) => (props.theme === 'dark' ? '#9E9E9E' : 'var(--bodyBlue)')};
	}
	.ant-pagination .ant-pagination-item {
		border-color: ${(props: any) => (props.theme === 'dark' ? '#4B4B4B' : '#D2D8E0')};
	}
	.ant-pagination .ant-pagination-item-active {
		color: #e5007a !important;
		border-color: #e5007a;
	}
	.ant-pagination .ant-pagination-item-active a {
		color: #e5007a !important;
	}
	.delegation-modal .ant-modal-root .ant-modal-mask {
		z-index: 1 !important;
	}
	.dark .ant-table-thead > tr > th {
		color: #9e9e9e !important;
	}
	.ant-table-tbody > tr {
		heigth: 56px !important;
	}
	.ant-table-wrapper .ant-table-pagination-right {
		justify-content: center !important;
		margin-top: 36px !important;
	}
	.ant-pagination .ant-pagination-options {
		display: none !important;
	}
	.ant-table-wrapper .ant-table-pagination.ant-pagination {
		justify-content: center !important;
	}
	.ant-input {
		background-color: transparent !important;
	}
	td {
		background-color: transparent !important;
	}
	.ant-table-tbody > tr.last-row {
		background-color: #e2ebff !important;
	}
	.ant-table-tbody > tr.last-row > td {
		border-top: 1px solid #486ddf !important;
		border-bottom: 1px solid #486ddf !important;
	}
	.ant-table-wrapper .ant-table-cell-fix-left {
		background-color: #fff !important;
	}
	.ant-table-content {
		overflow: auto hidden !important;
	}
`;
