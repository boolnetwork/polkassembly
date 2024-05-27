// Copyright 2019-2025 @polkassembly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.
import React, { useEffect, useState } from 'react';
import { Checkbox, Divider, Form } from 'antd';
import { useNetworkSelector, useOnchainIdentitySelector, useUserDetailsSelector } from '~src/redux/selectors';
import Alert from '~src/basic-components/Alert';
import { trackEvent } from 'analytics';
import getIdentityRegistrarIndex from '~src/util/getIdentityRegistrarIndex';
import { IIdentityForm, ITxFee, WHITESPACE } from './types';
import executeTx from '~src/util/executeTx';
import queueNotification from '~src/ui-components/QueueNotification';
import { useDispatch } from 'react-redux';
import { onchainIdentityActions } from '~src/redux/onchainIdentity';
import { NotificationStatus } from '~src/types';
import nextApiClientFetch from '~src/util/nextApiClientFetch';
import { MessageType } from '~src/auth/types';
import messages from '~src/auth/utils/messages';
import ProxyAccountSelectionForm from '~src/ui-components/ProxyAccountSelectionForm';
import CustomButton from '~src/basic-components/buttons/CustomButton';
import Address from '~src/ui-components/Address';
import { poppins } from 'pages/_app';
import { EmailIcon, InfoIcon, TwitterIcon, VerifiedIcon } from '~src/ui-components/CustomIcons';
import Balance from '../Balance';
import HelperTooltip from '~src/ui-components/HelperTooltip';
import BN from 'bn.js';
import { useTheme } from 'next-themes';
import { checkIdentityFieldsValidity } from './utils/checkIdentityFieldsValidity';
import { BN_ONE } from '@polkadot/util';
import styled from 'styled-components';
import Input from '~src/basic-components/Input';
import IdentityTxBreakdown from './identityTxFeeBreakDown';
import IdentityFormActionButtons from './IdentityFormActionButtons';
import allowSetIdentity from './utils/allowSetIdentity';
import { network as AllNetworks } from 'src/global/networkConstants';
import { useApiContext, usePeopleKusamaApiContext } from '~src/context';
import { ApiPromise } from '@polkadot/api';

const ZERO_BN = new BN(0);

interface ValueState {
	info: Record<string, unknown>;
	okAll: boolean;
}
const IdentityForm = ({
	closeModal,
	onCancel,
	perSocialBondFee,
	setAddressChangeModalOpen,
	setStartLoading,
	setTxFee,
	txFee,
	className,
	form,
	setOpenIdentitySuccessModal
}: IIdentityForm) => {
	const dispach = useDispatch();
	const { network } = useNetworkSelector();
	const currentUser = useUserDetailsSelector();
	const { api: defaultApi, apiReady: defaultApiReady } = useApiContext();
	const { peopleKusamaApi, peopleKusamaApiReady } = usePeopleKusamaApiContext();
	const [{ api, apiReady }, setApiDetails] = useState<{ api: ApiPromise | null; apiReady: boolean }>({ api: defaultApi || null, apiReady: defaultApiReady || false });
	const { displayName, identityAddress, legalName, socials, identityInfo, wallet } = useOnchainIdentitySelector();
	const { resolvedTheme: theme } = useTheme();
	const { email, twitter } = socials;
	const { bondFee, gasFee, registerarFee, minDeposite } = txFee;
	const [{ info, okAll }, setInfo] = useState<ValueState>({ info: {}, okAll: false });
	const [availableBalance, setAvailableBalance] = useState<BN | null>(null);
	const [proxyAddresses, setProxyAddresses] = useState<string[]>([]);
	const [selectedProxyAddress, setSelectedProxyAddress] = useState('');
	const [showProxyDropdown, setShowProxyDropdown] = useState<boolean>(false);
	const [isProxyExistsOnWallet, setIsProxyExistsOnWallet] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(false);
	const totalFee = gasFee.add(bondFee?.add(registerarFee?.add(!!identityInfo?.alreadyVerified || !!identityInfo.isIdentitySet ? ZERO_BN : minDeposite)));

	useEffect(() => {
		if (network === 'kusama') {
			setApiDetails({ api: peopleKusamaApi || null, apiReady: peopleKusamaApiReady });
		} else {
			setApiDetails({ api: defaultApi || null, apiReady: defaultApiReady || false });
		}
	}, [network, peopleKusamaApi, peopleKusamaApiReady, defaultApi, defaultApiReady]);

	const getProxies = async (address: any) => {
		const proxies: any = (await api?.query?.proxy?.proxies(address))?.toJSON();
		if (proxies) {
			const proxyAddr = proxies[0].map((proxy: any) => proxy.delegate);
			setProxyAddresses(proxyAddr);
			setSelectedProxyAddress('');
		}
	};

	const handleIdentityHashSave = async (hash: string) => {
		if (!hash) return;
		const { data, error } = await nextApiClientFetch<MessageType>(`api/v1/verification/save-identity-hash?identityHash=${hash}`);
		if (data?.message === messages.SUCCESS) {
			console.log('Identity hash successfully save');
		} else {
			console.log(error);
		}
	};

	const handleSetIdentity = async (requestJudgement: boolean) => {
		if (identityInfo?.email && identityInfo?.displayName && allowSetIdentity({ displayName, email, identityInfo, legalName, twitter })) {
			// GAEvent for request judgement button clicked
			trackEvent('request_judgement_cta_clicked', 'initiated_judgement_request', {
				userId: currentUser?.id || '',
				userName: currentUser?.username || ''
			});
		} else {
			// GAEvent for set identity button clicked
			trackEvent('set_identity_cta_clicked', 'clicked_set_identity_cta', {
				userId: currentUser?.id || '',
				userName: currentUser?.username || ''
			});
		}
		const registrarIndex = getIdentityRegistrarIndex({ network: network });

		if (!api || !apiReady || !okAll || registrarIndex === null) return;
		if (requestJudgement && identityInfo?.alreadyVerified) return;

		let tx;
		if (requestJudgement) {
			tx = api.tx?.identity?.requestJudgement(registrarIndex, txFee.registerarFee.toString());
		} else {
			const requestedJudgementTx = api.tx?.identity?.requestJudgement(registrarIndex, txFee.registerarFee.toString());
			const identityTx = api.tx?.identity?.setIdentity(info);
			tx = api.tx.utility.batchAll([identityTx, requestedJudgementTx]);
		}

		setStartLoading({ isLoading: true, message: 'Awaiting confirmation' });

		const onSuccess = async () => {
			const identityHash = await api?.query?.identity
				?.identityOf(identityAddress)
				.then((res: any) => ([AllNetworks.KUSAMA, AllNetworks.POLKADOT].includes(network) ? res.unwrap()[0] : (res.unwrapOr(null) as any))?.info?.hash?.toHex());
			if (!identityHash) {
				setStartLoading({ isLoading: false, message: '' });
				console.log('Error in unwraping identityHash');
			}
			setStartLoading({ isLoading: false, message: '' });
			closeModal(true);
			setOpenIdentitySuccessModal(true);
			localStorage.setItem(`isIdentityCallDone_${identityAddress}`, 'true');
			dispach(onchainIdentityActions.setOnchainIdentityHash(identityHash));
			await handleIdentityHashSave(identityHash);
		};
		const onFailed = () => {
			queueNotification({
				header: 'failed!',
				message: 'Transaction failed!',
				status: NotificationStatus.ERROR
			});
			setLoading(false);
			setStartLoading({ isLoading: false, message: '' });
		};

		let payload: any = {
			address: identityAddress,
			api,
			apiReady,
			errorMessageFallback: 'failed.',
			network,
			onFailed,
			onSuccess,
			setStatus: (message: string) => setStartLoading({ isLoading: true, message }),
			tx
		};

		if (selectedProxyAddress?.length && showProxyDropdown) {
			payload = {
				...payload,
				proxyAddress: selectedProxyAddress || ''
			};
		}

		await executeTx(payload);
	};

	const handleOnAvailableBalanceChange = (balanceStr: string) => {
		let balance = ZERO_BN;

		try {
			balance = new BN(balanceStr);
		} catch (err) {
			console.log(err);
		}
		setAvailableBalance(balance);
	};

	const getGasFee = async (initialLoading?: boolean, txFeeVal?: ITxFee) => {
		if (!txFeeVal) {
			txFeeVal = txFee;
		}
		if (!api || !apiReady || (!okAll && !initialLoading) || !form.getFieldValue('displayName') || !form.getFieldValue('email') || !identityAddress) {
			setTxFee({ ...txFeeVal, gasFee: ZERO_BN });
			return;
		}

		let tx = api.tx.identity.setIdentity(info);
		let signingAddress = identityAddress;
		setLoading(true);
		if (selectedProxyAddress?.length && showProxyDropdown) {
			tx = api?.tx?.proxy.proxy(identityAddress, null, api.tx.identity.setIdentity(info));
			signingAddress = selectedProxyAddress;
		}

		const paymentInfo = await tx.paymentInfo(signingAddress);

		setTxFee({ ...txFeeVal, gasFee: paymentInfo.partialFee });
		setLoading(false);
	};

	const handleInfo = (initialLoading?: boolean) => {
		const displayNameVal = form.getFieldValue('displayName')?.trim();
		const legalNameVal = form.getFieldValue('legalName')?.trim();
		const emailVal = form.getFieldValue('email')?.trim();
		const twitterVal = (form.getFieldValue('twitter') || '').trim();

		const okDisplay = checkIdentityFieldsValidity(displayNameVal.length > 0, displayNameVal, 1, [], [], []);
		const okLegal = checkIdentityFieldsValidity(legalNameVal.length > 0, legalNameVal, 1, [], [], []);
		const okEmail = checkIdentityFieldsValidity(emailVal.length > 0, emailVal, 3, ['@'], WHITESPACE, []);
		// const okRiot = checkIdentityFieldsValidity((riotVal).length > 0, (riotVal), 6, [':'], WHITESPACE, ['@', '~']);
		const okTwitter = checkIdentityFieldsValidity(twitterVal.length > 0, twitterVal, 3, [], [...WHITESPACE, '/'], []);
		// const okWeb = checkIdentityFieldsValidity((webVal).length > 0, (webVal), 8, ['.'], WHITESPACE, ['https://', 'http://']);

		let okSocials = 1;
		if (okEmail && emailVal.length > 0 && identityInfo?.email !== emailVal) {
			okSocials += 1;
		}
		if (okTwitter && twitterVal.length > 0 && identityInfo?.twitter !== twitterVal) {
			okSocials += 1;
		}

		setInfo({
			info: {
				discord: { [identityInfo?.discord.length > 0 ? 'raw' : 'none']: identityInfo?.discord.length > 0 ? identityInfo?.discord : null },
				display: { [okDisplay ? 'raw' : 'none']: displayNameVal || null },
				email: { [okEmail && emailVal.length > 0 ? 'raw' : 'none']: okEmail && emailVal.length > 0 ? emailVal : null },
				github: { [identityInfo?.github.length > 0 ? 'raw' : 'none']: identityInfo?.github.length > 0 ? identityInfo?.github : null },
				legal: { [okLegal && legalNameVal.length > 0 ? 'raw' : 'none']: okLegal && legalNameVal.length > 0 ? legalNameVal : null },
				matrix: { [identityInfo?.matrix.length > 0 ? 'raw' : 'none']: identityInfo?.matrix.length > 0 ? identityInfo?.matrix : null },
				riot: { [identityInfo?.riot.length > 0 ? 'raw' : 'none']: identityInfo?.riot.length > 0 ? identityInfo?.riot : null },
				twitter: { [okTwitter && twitterVal.length > 0 ? 'raw' : 'none']: okTwitter && twitterVal.length > 0 ? twitterVal : null },
				web: { [identityInfo?.web.length > 0 ? 'raw' : 'none']: identityInfo?.web.length > 0 ? identityInfo?.web : null }
			},
			okAll: twitterVal.length
				? okDisplay && okEmail && okLegal && okTwitter && displayNameVal?.length > 1 && !!emailVal && !!twitterVal
				: okDisplay && okEmail && okLegal && okTwitter && displayNameVal?.length > 1 && !!emailVal
		});
		const okSocialsBN = new BN(okSocials - 1 || BN_ONE);
		const fee = { ...txFee, bondFee: okSocials === 1 ? ZERO_BN : perSocialBondFee?.mul(okSocialsBN) };
		setTxFee(fee);
		if (initialLoading) {
			getGasFee(true, fee);
		}
	};

	useEffect(() => {
		handleInfo(true);
		getProxies(identityAddress);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [identityAddress]);

	return (
		<div className={className}>
			<Form
				form={form}
				initialValues={{ displayName, email: email?.value, legalName, twitter: twitter?.value }}
			>
				{totalFee.gt(ZERO_BN) &&
					(!identityInfo?.alreadyVerified || allowSetIdentity({ displayName, email, identityInfo, legalName, twitter })) &&
					availableBalance &&
					availableBalance.lte(totalFee) && (
						<Alert
							className='mb-6 rounded-[4px]'
							type='warning'
							showIcon
							message={<p className='m-0 p-0 text-xs dark:text-blue-dark-high'>Insufficient available balance</p>}
						/>
					)}
				{identityInfo?.alreadyVerified && allowSetIdentity({ displayName, email, identityInfo, legalName, twitter }) && (
					<Alert
						className='mb-6 rounded-[4px]'
						type='warning'
						showIcon
						message={
							<p className='m-0 p-0 text-xs dark:text-blue-dark-high'>
								For judgement to be requested, one of the credentials must be updated, as this address already has judgement.
							</p>
						}
					/>
				)}
				{!!identityInfo?.email &&
					!!identityInfo?.displayName &&
					!identityInfo?.alreadyVerified &&
					allowSetIdentity({ displayName, email, identityInfo, legalName, twitter }) &&
					availableBalance &&
					availableBalance.gt(totalFee) && (
						<Alert
							className='mb-6 rounded-[4px]'
							type='warning'
							showIcon
							message={
								<p className='m-0 p-0 text-xs dark:text-blue-dark-high'>
									This account has already set social verification. Kindly{' '}
									<span
										className='cursor-pointer font-semibold text-pink_primary'
										onClick={() => handleSetIdentity(true)}
									>
										Request Judgement
									</span>{' '}
									to complete the process
								</p>
							}
						/>
					)}
				{!identityInfo.email && identityInfo.isIdentitySet && !email.value && (
					<Alert
						className='mb-6 rounded-[4px]'
						type='warning'
						showIcon
						message={<p className='m-0 p-0 text-xs dark:text-blue-dark-high'>Please provide your email for request judgement. </p>}
					/>
				)}
				<div className='flex items-center justify-between text-lightBlue dark:text-blue-dark-medium'>
					<label className='text-sm text-lightBlue dark:text-blue-dark-high'>
						Your Address{' '}
						<HelperTooltip
							className='ml-1'
							text='Please note the verification cannot be transferred to another address.'
						/>
					</label>
					{(!!identityAddress || !!currentUser.loginAddress) && (
						<Balance
							address={identityAddress || currentUser.loginAddress}
							onChange={handleOnAvailableBalanceChange}
						/>
					)}
				</div>
				<div className='flex w-full items-end gap-2 text-sm '>
					<div className='flex h-10 w-full items-center justify-between rounded-[4px] border-[1px] border-solid border-[#D2D8E0] bg-[#f5f5f5] px-2 dark:border-[#3B444F] dark:border-separatorDark dark:bg-section-dark-overlay'>
						<Address
							address={identityAddress || currentUser.loginAddress}
							isTruncateUsername={false}
							displayInline
						/>
						<CustomButton
							text='Change Wallet'
							onClick={() => {
								setAddressChangeModalOpen();
								closeModal(true);
							}}
							width={91}
							className='change-wallet-button mr-1 flex items-center justify-center text-[10px]'
							height={21}
							variant='primary'
						/>
					</div>
				</div>
				{!!proxyAddresses && proxyAddresses?.length > 0 && (
					<div className='mt-2'>
						<Checkbox
							value=''
							className='text-xs text-bodyBlue dark:text-blue-dark-medium'
							onChange={() => {
								setShowProxyDropdown(!showProxyDropdown);
							}}
						>
							<p className='m-0 mt-1 p-0'>Use proxy address</p>
						</Checkbox>
					</div>
				)}
				{!!proxyAddresses && !!proxyAddresses?.length && showProxyDropdown && (
					<ProxyAccountSelectionForm
						proxyAddresses={proxyAddresses}
						theme={theme as string}
						address={identityAddress || currentUser.loginAddress}
						withBalance
						heading={'Proxy Address'}
						isUsedInIdentity={true}
						className={`${poppins.variable} ${poppins.className} mt-2 rounded-[4px] px-3 text-sm font-normal text-lightBlue dark:text-blue-dark-medium`}
						inputClassName='rounded-[4px] px-3 py-0.5'
						wallet={wallet}
						setIsProxyExistsOnWallet={setIsProxyExistsOnWallet}
						setSelectedProxyAddress={setSelectedProxyAddress}
						selectedProxyAddress={selectedProxyAddress?.length ? selectedProxyAddress : proxyAddresses?.[0]}
					/>
				)}
				{!!proxyAddresses && !!proxyAddresses?.length && showProxyDropdown && !isProxyExistsOnWallet && (
					<div className='mt-2 flex items-center gap-x-1'>
						<InfoIcon />
						<p className='m-0 p-0 text-xs text-errorAlertBorderDark'>Proxy address does not exist on selected wallet</p>
					</div>
				)}
				<div className='mt-6'>
					<label className='text-sm text-lightBlue dark:text-blue-dark-high'>
						Display Name <span className='text-[#FF3C5F]'>*</span>
					</label>
					<Form.Item
						name='displayName'
						rules={[
							{
								message: 'Invalid display name',
								validator(rule, value, callback) {
									if (
										callback &&
										value.length &&
										!checkIdentityFieldsValidity(form?.getFieldValue('displayName')?.trim()?.length > 0, form?.getFieldValue('displayName')?.trim(), 1, [], [], [])
									) {
										callback(rule?.message?.toString());
									} else {
										callback();
									}
								}
							}
						]}
					>
						<Input
							onBlur={() => getGasFee(false)}
							name='displayName'
							className='mt-0.5 h-10 rounded-[4px] text-bodyBlue dark:border-separatorDark dark:bg-transparent dark:text-blue-dark-high dark:placeholder-[#909090] dark:focus:border-[#91054F]'
							placeholder='Enter a name for your identity '
							value={displayName}
							onChange={(e) => {
								dispach(onchainIdentityActions.setOnchainDisplayName(e.target.value.trim()));
								handleInfo();
							}}
						/>
					</Form.Item>
				</div>
				<div className='mt-6'>
					<label className='text-sm text-lightBlue dark:text-blue-dark-high'>Legal Name</label>
					<Form.Item
						name='legalName'
						rules={[
							{
								message: 'Invalid legal name',
								validator(rule, value, callback) {
									if (
										callback &&
										value.length &&
										!checkIdentityFieldsValidity(form?.getFieldValue('legalName')?.trim()?.length > 0, form?.getFieldValue('legalName')?.trim(), 1, [], [], [])
									) {
										callback(rule?.message?.toString());
									} else {
										callback();
									}
								}
							}
						]}
					>
						<Input
							onBlur={() => getGasFee()}
							name='legalName'
							className='h-10 rounded-[4px] text-bodyBlue dark:border-separatorDark dark:bg-transparent dark:text-blue-dark-high dark:focus:border-[#91054F]'
							placeholder='Enter your full name'
							value={legalName}
							onChange={(e) => {
								dispach(onchainIdentityActions.setOnchainLegalName(e.target.value.trim()));
								handleInfo();
							}}
						/>
					</Form.Item>
				</div>
				<Divider />
				<div>
					<label className='text-sm font-medium text-lightBlue dark:text-blue-dark-high'>
						Socials{' '}
						<HelperTooltip
							className='ml-1'
							text='Please add your social handles that require verification.'
						/>
					</label>

					<div className='mt-1 flex items-center  '>
						<span className='mb-6 flex w-[150px] items-center gap-2'>
							<EmailIcon className='rounded-full bg-[#edeff3] p-2.5 text-xl text-blue-light-helper dark:bg-inactiveIconDark dark:text-blue-dark-medium' />
							<span className='text-sm text-lightBlue dark:text-blue-dark-high'>
								Email<span className='ml-1 text-[#FF3C5F]'>*</span>
							</span>
						</span>
						<Form.Item
							name='email'
							className='w-full'
							rules={[
								{
									message: 'Invalid email address',
									validator(rule, value, callback) {
										if (
											callback &&
											value.length > 0 &&
											!checkIdentityFieldsValidity(form.getFieldValue('email')?.trim()?.length > 0, form.getFieldValue('email')?.trim(), 3, ['@'], WHITESPACE, [])
										) {
											callback(rule?.message?.toString());
										} else {
											callback();
										}
									}
								}
							]}
						>
							<Input
								onBlur={() => getGasFee()}
								addonAfter={email?.verified && identityInfo?.email === form?.getFieldValue('email') && <VerifiedIcon className='text-xl' />}
								name='email'
								value={email?.value}
								placeholder='Enter your email address'
								className={`h-10 rounded-[4px] text-bodyBlue dark:border-separatorDark dark:bg-transparent dark:text-blue-dark-high dark:focus:border-[#91054F] ${theme}`}
								onChange={(e) => {
									dispach(onchainIdentityActions.setOnchainSocials({ ...socials, email: { ...email, value: e.target.value?.trim() } }));
									handleInfo();
								}}
							/>
						</Form.Item>
					</div>

					<div className='mt-1 flex items-center'>
						<span className='mb-6 flex w-[150px] items-center gap-2'>
							<TwitterIcon className='rounded-full bg-[#edeff3] p-2.5 text-xl text-blue-light-helper dark:bg-inactiveIconDark dark:text-blue-dark-medium' />
							<span className='text-sm text-lightBlue dark:text-blue-dark-high'>Twitter</span>
						</span>
						<Form.Item
							name='twitter'
							className='w-full'
							rules={[
								{
									message: 'Invalid twitter username',
									validator(rule, value, callback) {
										if (
											callback &&
											value.length &&
											!checkIdentityFieldsValidity(form.getFieldValue('twitter')?.trim()?.length > 0, form.getFieldValue('twitter')?.trim(), 3, [], [...WHITESPACE, '/'], [])
										) {
											callback(rule?.message?.toString());
										} else {
											callback();
										}
									}
								}
							]}
						>
							<Input
								onBlur={() => getGasFee()}
								name='twitter'
								addonAfter={twitter?.verified && identityInfo?.twitter === form?.getFieldValue('twitter') && <VerifiedIcon className='text-xl' />}
								value={twitter?.value}
								placeholder='Enter your twitter handle (case sensitive)'
								className={`h-10 rounded-[4px] text-bodyBlue dark:border-separatorDark dark:bg-transparent dark:text-blue-dark-high dark:focus:border-[#91054F] ${theme}`}
								onChange={(e) => {
									dispach(onchainIdentityActions.setOnchainSocials({ ...socials, twitter: { ...twitter, value: e.target.value?.trim() } }));
									handleInfo();
								}}
							/>
						</Form.Item>
					</div>
				</div>
			</Form>

			{/* tx amount breakdown */}
			<IdentityTxBreakdown
				loading={loading}
				perSocialBondFee={perSocialBondFee}
				txFee={txFee}
			/>
			<IdentityFormActionButtons
				availableBalance={availableBalance}
				handleSetIdentity={handleSetIdentity}
				isProxyExistsOnWallet={isProxyExistsOnWallet}
				loading={loading}
				okAll={okAll}
				onCancel={onCancel}
				proxyAddresses={proxyAddresses}
				showProxyDropdown={showProxyDropdown}
				txFee={txFee}
				key={'IdentityFormActionButtons'}
			/>
		</div>
	);
};
export default styled(IdentityForm)`
	.change-wallet-button {
		font-size: 10px !important;
	}
`;
