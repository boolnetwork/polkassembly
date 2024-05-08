// Copyright 2019-2025 @polkassembly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.
import React, { useEffect, useState } from 'react';
import Table from '~src/basic-components/Tables/Table';
import { ColumnsType } from 'antd/lib/table';
import StarIcon from '~assets/icons/StarIcon.svg';
import InfoIcon from '~assets/info.svg';
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
import { formatTimestamp } from './utils';
import Tipping from '~src/components/Tipping';

interface Props {
	className: string;
	searchedUsername?: string;
}

const LeaderboardData = ({ className, searchedUsername }: Props) => {
	const { resolvedTheme: theme } = useTheme();
	const [currentPage, setCurrentPage] = useState(1);
	const [address, setAddress] = useState<string>('');
	const [tableData, setTableData] = useState<any>();
	const [totalData, setTotalData] = useState<number>(0);
	const [open, setOpen] = useState<boolean>(false);
	const [openTipping, setOpenTipping] = useState<boolean>(false);
	const [openAddressChangeModal, setOpenAddressChangeModal] = useState<boolean>(false);
	const [tippingUser, setTippingUser] = useState<string>('');

	const router = useRouter();

	const getLeaderboardData = async () => {
		let body;
		if (searchedUsername && searchedUsername !== '') {
			body = {
				username: searchedUsername || ''
			};
		} else {
			body = {
				page: currentPage
			};
		}
		const { data, error } = await nextApiClientFetch<LeaderboardResponse>('api/v1/leaderboard', body);

		if (error) {
			console.error(error);
			return;
		}

		if (data) {
			if (searchedUsername && searchedUsername !== '') {
				setTableData(data.data);
				setTotalData(1);
			} else {
				setTableData(currentPage === 1 ? data.data.slice(3) : data.data);
				setTotalData(currentPage === 1 ? 47 : 50);
			}
		}
	};

	useEffect(() => {
		router.isReady && getLeaderboardData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, router.isReady, searchedUsername]);

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
			fixed: 'left',
			key: 'rank',
			render: (rank) => <p className='m-0 p-0 text-sm text-bodyBlue dark:text-white'>{rank < 10 ? `0${rank}` : rank}</p>,
			title: 'Rank',
			width: 15
		},
		{
			dataIndex: 'user',
			filteredValue: [searchedUsername || ''],
			fixed: 'left',
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
					<NameLabel
						usernameClassName='max-w-[9vw] 2xl:max-w-[12vw] text-sm text-bodyBlue dark:text-white'
						// defaultAddress={proposer}
						username={user}
						usernameMaxLength={15}
						truncateUsername={false}
						isUsedInLeadership={true}
					/>
				</div>
			),
			title: 'User',
			width: 250
		},
		{
			dataIndex: 'profileScore',
			fixed: 'left',
			key: 'profileScore',
			render: (profileScore) => (
				<div
					className='flex h-7 w-[93px] items-center justify-center gap-x-0.5 rounded-md px-2 py-2'
					style={{ background: 'linear-gradient(0deg, #FFD669 0%, #FFD669 100%), #FCC636' }}
				>
					<StarIcon />
					<p className='m-0 ml-1.5 p-0 text-sm text-[#534930]'>{profileScore}</p>
					<InfoIcon style={{ transform: 'scale(0.8)' }} />
				</div>
			),
			sorter: (a, b) => a.profileScore - b.profileScore,
			title: 'Profile Score',
			width: 150
		},
		{
			dataIndex: 'userSince',
			fixed: 'left',
			key: 'userSince',
			render: (userSince) => (
				<div className='flex w-[120px] items-center justify-start gap-x-1'>
					<ImageIcon
						src='/assets/icons/Calendar.svg'
						alt='calenderIcon'
						className='icon-container scale-[0.8]'
					/>
					<p className='m-0 p-0 text-xs text-bodyBlue dark:text-white'>{userSince}</p>
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
			fixed: 'left',
			key: 'auction',
			render: (text, record) => (
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
		userSince: formatTimestamp(item?.created_at._seconds)
	}));

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
				dataSource={dataSource}
				pagination={{ pageSize: 10, total: totalData }}
				onChange={handleTableChange}
				theme={theme}
			></Table>
		</div>
	);
};

export default styled(LeaderboardData)`
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
`;
