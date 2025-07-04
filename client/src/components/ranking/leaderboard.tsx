import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardProps {
  rankings: any[];
  isLoading: boolean;
}

// Mock data for demonstration
const mockRankings = [
  {
    position: 1,
    user: { firstName: "Ana", lastName: "Nascimento", profileImageUrl: null },
    totalPoints: 2856,
    totalSales: 15,
  },
  {
    position: 2,
    user: { firstName: "Maria", lastName: "Paula", profileImageUrl: null },
    totalPoints: 2340,
    totalSales: 12,
  },
  {
    position: 3,
    user: { firstName: "Roberto", lastName: "Silva", profileImageUrl: null },
    totalPoints: 2180,
    totalSales: 10,
  },
  {
    position: 4,
    user: { firstName: "João", lastName: "Silva", profileImageUrl: null },
    totalPoints: 1875,
    totalSales: 8,
  },
  {
    position: 5,
    user: { firstName: "Carlos", lastName: "Ferreira", profileImageUrl: null },
    totalPoints: 1620,
    totalSales: 7,
  },
];

export default function Leaderboard({ rankings, isLoading }: LeaderboardProps) {
  const { user } = useAuth();
  
  const displayRankings = rankings.length > 0 ? rankings : mockRankings;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return "bg-yellow-400";
      case 2: return "bg-gray-300";
      case 3: return "bg-amber-600";
      default: return "bg-gray-500";
    }
  };

  const isCurrentUser = (rankingUser: any) => {
    return rankingUser.firstName === user?.firstName && rankingUser.lastName === user?.lastName;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ranking Mensal</CardTitle>
          <Select defaultValue="2024-01">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">Janeiro 2024</SelectItem>
              <SelectItem value="2023-12">Dezembro 2023</SelectItem>
              <SelectItem value="2023-11">Novembro 2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 2nd Place */}
          <div className="text-center">
            <div className="relative">
              <Avatar className="w-16 h-16 mx-auto mb-2">
                <AvatarImage src={displayRankings[1]?.user.profileImageUrl} />
                <AvatarFallback className="bg-gray-300 text-white text-lg font-bold">
                  {getInitials(displayRankings[1]?.user.firstName, displayRankings[1]?.user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
            </div>
            <p className="font-medium text-gray-900">{displayRankings[1]?.user.firstName} {displayRankings[1]?.user.lastName}</p>
            <p className="text-sm text-gray-600">{displayRankings[1]?.totalPoints.toLocaleString()} pts</p>
          </div>
          
          {/* 1st Place */}
          <div className="text-center -mt-4">
            <div className="relative">
              <Avatar className="w-20 h-20 mx-auto mb-2">
                <AvatarImage src={displayRankings[0]?.user.profileImageUrl} />
                <AvatarFallback className="bg-yellow-400 text-white text-xl font-bold">
                  {getInitials(displayRankings[0]?.user.firstName, displayRankings[0]?.user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="font-bold text-gray-900">{displayRankings[0]?.user.firstName} {displayRankings[0]?.user.lastName}</p>
            <p className="text-sm text-green-600 font-medium">{displayRankings[0]?.totalPoints.toLocaleString()} pts</p>
          </div>
          
          {/* 3rd Place */}
          <div className="text-center">
            <div className="relative">
              <Avatar className="w-16 h-16 mx-auto mb-2">
                <AvatarImage src={displayRankings[2]?.user.profileImageUrl} />
                <AvatarFallback className="bg-amber-600 text-white text-lg font-bold">
                  {getInitials(displayRankings[2]?.user.firstName, displayRankings[2]?.user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-700 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">3</span>
              </div>
            </div>
            <p className="font-medium text-gray-900">{displayRankings[2]?.user.firstName} {displayRankings[2]?.user.lastName}</p>
            <p className="text-sm text-gray-600">{displayRankings[2]?.totalPoints.toLocaleString()} pts</p>
          </div>
        </div>
        
        {/* Ranking List */}
        <div className="space-y-3">
          {displayRankings.slice(3).map((ranking) => (
            <div
              key={ranking.position}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isCurrentUser(ranking.user) ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 ${getPositionColor(ranking.position)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {ranking.position}
                </span>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={ranking.user.profileImageUrl} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getInitials(ranking.user.firstName, ranking.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {ranking.user.firstName} {ranking.user.lastName}
                    {isCurrentUser(ranking.user) && " (Você)"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {ranking.totalPoints.toLocaleString()} pts • {ranking.totalSales} vendas
                  </p>
                </div>
              </div>
              {isCurrentUser(ranking.user) && (
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">+25 pts hoje</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
