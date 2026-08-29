import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  UserPlus,
  Users,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Friend } from '../../types';

export const FriendsView: React.FC = () => {
  const {
    friends,
    formatAmount,
    totalOwedToYou,
    totalYouOwe,
    setIsAddFriendOpen,
    setIsSettleUpOpen,
    setSettleTargetFriend,
    setSelectedFriendDetail,
    setIsAddExpenseOpen,
  } = useFinance();

  const handleSettleFriend = (friend: Friend, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettleTargetFriend(friend);
    setIsSettleUpOpen(true);
  };

  const handleAddExpenseForFriend = (friend: Friend, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddExpenseOpen(true);
  };

  return (
    <div id="friends-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[32px] md:text-[36px] font-bold text-[#00000b] tracking-tight">
            Network
          </h1>
          <p className="text-[14px] text-[#47464c] mt-1">
            Manage shared balances with your connections.
          </p>
        </div>
        <button
          id="add-friend-main-btn"
          onClick={() => setIsAddFriendOpen(true)}
          className="bg-[#675df9] hover:bg-[#4d41df] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide transition-all flex items-center gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      </div>

      {/* Global Summary Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#c8c5cd]/60 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#00C853] transition-colors shadow-xs">
          <div className="absolute top-3 right-3 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-[#00C853]" />
          </div>
          <span className="text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-2">
            Total Owed to You
          </span>
          <span className="text-[32px] font-mono-amount font-bold text-[#00C853] tracking-tight">
            {formatAmount(totalOwedToYou)}
          </span>
          <div className="mt-4 text-[13px] text-[#47464c] flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>
              From {friends.filter((f) => f.netBalance > 0).length} friends
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#c8c5cd]/60 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#ba1a1a] transition-colors shadow-xs">
          <div className="absolute top-3 right-3 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-16 h-16 text-[#ba1a1a]" />
          </div>
          <span className="text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-2">
            Total You Owe
          </span>
          <span className="text-[32px] font-mono-amount font-bold text-[#ba1a1a] tracking-tight">
            -{formatAmount(totalYouOwe)}
          </span>
          <div className="mt-4 text-[13px] text-[#47464c] flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>
              To {friends.filter((f) => f.netBalance < 0).length} friends
            </span>
          </div>
        </div>
      </div>

      {/* Friends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {friends.map((friend) => {
          const isPositive = friend.netBalance > 0;
          const isNegative = friend.netBalance < 0;
          const isSettled = friend.netBalance === 0;

          return (
            <div
              key={friend.id}
              onClick={() => setSelectedFriendDetail(friend)}
              className="relative bg-white border border-[#c8c5cd]/60 rounded-2xl p-5 flex flex-col justify-between overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-[#675df9] h-[235px] cursor-pointer"
            >
              {/* Header Info */}
              <div className="flex items-center gap-3 z-10">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="w-13 h-13 rounded-full object-cover border border-[#c8c5cd]/60 shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-[#f1edef] text-[#1c1b1d] font-bold text-[16px] flex items-center justify-center border border-[#c8c5cd]/60 shrink-0">
                    {friend.initials || 'FD'}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-[#00000b] truncate">
                    {friend.name}
                  </h3>
                  <p className="text-[13px] text-[#47464c] truncate">
                    {friend.handle}
                  </p>
                </div>
              </div>

              {/* Balance Summary Display */}
              <div className="mt-auto z-10 transition-transform duration-300 group-hover:-translate-y-3">
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-1">
                  Net Balance
                </p>
                <p
                  className={`text-[24px] font-mono-amount font-bold ${
                    isPositive
                      ? 'text-[#00C853]'
                      : isNegative
                      ? 'text-[#ba1a1a]'
                      : 'text-[#47464c]'
                  }`}
                >
                  {isPositive && '+'}
                  {formatAmount(friend.netBalance)}
                </p>
                <p className="text-[12px] text-[#78767d] mt-0.5">
                  {isPositive && 'She/He owes you'}
                  {isNegative && 'You owe him/her'}
                  {isSettled && 'Settled up'}
                </p>
              </div>

              {/* Hover Detailed Breakdown Overlay */}
              <div className="absolute inset-0 bg-[#f6f2f4]/95 backdrop-blur-xs p-4 flex flex-col transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 border-t border-[#c8c5cd]/60 rounded-2xl">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#c8c5cd]/40">
                  <span className="text-[13px] font-bold text-[#00000b]">
                    {isSettled ? 'Activity' : 'Balance Details'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#78767d]" />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                  {friend.breakdown.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2 text-[#47464c]">
                      <CheckCircle2 className="w-6 h-6 text-[#00C853] mb-1" />
                      <p className="text-[12px]">All shared expenses settled</p>
                    </div>
                  ) : (
                    friend.breakdown.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#c8c5cd]/40 text-[12px]"
                      >
                        <span className="text-[#1c1b1d] truncate max-w-[130px]">
                          {item.title}
                        </span>
                        <span
                          className={`font-mono-amount font-semibold shrink-0 ${
                            item.amount >= 0
                              ? 'text-[#00C853]'
                              : 'text-[#ba1a1a]'
                          }`}
                        >
                          {item.amount >= 0 ? '+' : ''}
                          {formatAmount(item.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {isSettled ? (
                  <button
                    onClick={(e) => handleAddExpenseForFriend(friend, e)}
                    className="mt-2 w-full bg-white border border-[#c8c5cd] text-[#1c1b1d] py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider hover:bg-[#f1edef] transition-colors"
                  >
                    Add Expense
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleSettleFriend(friend, e)}
                    className={`mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      isPositive
                        ? 'bg-[#675df9] text-white hover:bg-[#4d41df]'
                        : 'border border-[#675df9] text-[#675df9] bg-white hover:bg-[#f1edef]'
                    }`}
                  >
                    {isPositive ? 'Settle Up' : 'Record Payment'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
