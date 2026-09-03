sed -i '/const toggleComments = async/i \
  const handleToggleCommentLike = async (adId: number, commentId: number, reaction: string = '"'"'like'"'"') => {\
    if (!token) {\
      setIsAuthModalOpen(true);\
      return;\
    }\
\
    setCommentsMap((prev) => ({\
      ...prev,\
      [adId]: (prev[adId] || []).map((c) => {\
        if (c.id === commentId) {\
          const isRemoving = c.user_reaction === reaction;\
          return {\
            ...c,\
            user_reaction: isRemoving ? null : reaction,\
            like_count: Math.max(0, (c.like_count || 0) + (isRemoving ? -1 : (c.user_reaction ? 0 : 1))),\
          };\
        }\
        return c;\
      })\
    }));\
\
    try {\
      await fetch(`/api/bulletin/comments/${commentId}/like`, {\
        method: '"'"'POST'"'"',\
        headers: {\
          '"'"'Content-Type'"'"': '"'"'application/json'"'"',\
          '"'"'Authorization'"'"': `Bearer ${token}`\
        },\
        body: JSON.stringify({ reaction })\
      });\
    } catch (e) {}\
  };\
' src/pages/BulletinBoardPage.tsx
