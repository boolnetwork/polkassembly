// Copyright 2019-2025 @polkassembly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { Tooltip, Avatar } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import InfoIcon from '~assets/info.svg';

const Container = styled.div`
	border-radius: 14px;
	max-width: 360px;
	width: 100%;
	height: auto;
	padding: 20px;
	background: linear-gradient(92deg, #ff9494 2.08%, #ffc471 97.09%);
	color: #243a57;
	display: flex;
	flex-direction: column;
	gap: 12px;
	h1 {
		font-size: 20px;
		font-style: normal;
		font-weight: 600;
		line-height: 24px;
		letter-spacing: 0.03px;
		margin: 0;
	}
	p {
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21px; /* 150% */
		letter-spacing: 0.07px;
		margin: 0;
	}
	svg {
		color: #243a57;
	}
	/* @media (max-width: 500px) {
		bottom: 100px;
		right: 26px;
	} */
`;

const PredictionCard = () => {
	const [YesPercentage, setYesPercentage] = useState(0);
	const [predictCount, setPredictCount] = useState(0);
	const [longCount, setLongCount] = useState(0);
	const [endDate, setEndDate] = useState('');

	useEffect(() => {
		async function getPredictionsData() {
			const data = await fetch('https://processor.rpc-0.zeitgeist.pm/graphql', {
				body: JSON.stringify({
					query: `query MarketDetails($marketId: Int = 307) {
                    markets(where: {marketId_eq: $marketId}) {
                        period {
                        end
                        }
                        assets {
                        assetId
                        price
                        }
                    }
                    marketStats(marketId: [$marketId]) {
                        participants
                    }
                    }`
				}),
				headers: {
					'Content-Type': 'application/json'
				},
				method: 'POST',
				next: { revalidate: 10 }
			})
				.then((res) => res.json())
				.then((res) => res.data);

			const timestamp = Number(data.markets[0].period.end);

			setEndDate(convertTimestampToDate(timestamp));
			setPredictCount(data.marketStats[0].participants);
			setLongCount(data.markets[0].assets[1].price);
		}
		getPredictionsData();
	}, []);

	function convertTimestampToDate(timestamp: number): string {
		const date = new Date(timestamp);
		const day = String(date.getDate()).padStart(2, '0');
		const month = date.toLocaleString('en-us', { month: 'short' });
		const year = String(date.getFullYear()).slice(-2);
		return `${day} ${month} ‘${year}`;
	}

	useEffect(() => {
		setYesPercentage(Math.round((longCount / 1) * 100));
	}, [longCount, predictCount]);

	return (
		<Container>
			<div className='flex items-center justify-between font-poppins'>
				<h1 className='flex items-center gap-1 text-xl font-semibold leading-6'>
					Prediction
					<Tooltip
						color='#243A57'
						title='Will this proposal pass or fail?'
					>
						<InfoIcon className='text-xl text-[#243A57]' />
					</Tooltip>
				</h1>
				<a
					className='font-mediums inline-block rounded-2xl border border-solid border-[#F02A4E] bg-white/40 px-3 py-1 text-xs text-[#F02A4E]'
					href='https://app.zeitgeist.pm/markets/307'
					target='_blank'
					rel='noreferrer'
				>
					Predict
				</a>
			</div>
			<div className='w-full'>
				<div className='relative h-5 w-full bg-white/40 transition-all'>
					<div className='absolute flex h-full w-full items-center justify-between px-3.5 text-xs font-medium text-[#243A57]'>
						<span>Long</span>
						<span className='transition-all'>{YesPercentage}%</span>
					</div>
					<div
						className='h-full bg-white transition-all'
						style={{ width: YesPercentage.toString() + '%' }}
					></div>
				</div>
			</div>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-0.5 text-xs text-[#485F7D]'>
					Ends: <span className='font-medium text-[#243A57]'>{endDate}</span>
				</div>
				<p className='flex items-center gap-1 text-xs font-medium text-[#485F7D]'>
					<Avatar.Group size='small'>
						<Avatar
							style={{
								backgroundImage: 'url(/assets/icons/avatars/avatar-eth.png)',
								backgroundRepeat: 'no-repeat',
								backgroundSize: 'cover',
								border: '1px solid #fff',
								height: 20,
								width: 20
							}}
						></Avatar>
						<Avatar
							style={{
								backgroundImage: 'url(/assets/icons/avatars/avatar-polkadot.png)',
								backgroundRepeat: 'no-repeat',
								backgroundSize: 'cover',
								border: '1px solid #fff',
								height: 20,
								width: 20
							}}
						></Avatar>
					</Avatar.Group>
					{predictCount} predictions
				</p>
			</div>
		</Container>
	);
};
export default PredictionCard;
