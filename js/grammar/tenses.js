/**
 * Lý thuyết 13 thì cơ bản trong tiếng Anh.
 * Mỗi thì: công thức (khẳng định / phủ định / nghi vấn), cách dùng kèm ví dụ, dấu hiệu nhận biết, ví dụ thêm, lưu ý.
 * uses: [mô tả, ví dụ EN, dịch VI]   examples: [EN, VI]
 */
export const TENSES = [
  {
    id: 'ps', name: 'Present Simple', vi: 'Hiện tại đơn', icon: '☀️', group: 'Hiện tại',
    short: 'Thói quen, sự thật hiển nhiên, lịch trình cố định',
    formula: { aff: 'S + V(s/es) &nbsp;|&nbsp; S + am/is/are + ...', neg: 'S + do/does not + V &nbsp;|&nbsp; S + am/is/are not + ...', q: 'Do/Does + S + V? &nbsp;|&nbsp; Am/Is/Are + S + ...?' },
    uses: [
      ['Thói quen, hành động lặp đi lặp lại', 'I get up at 6 every morning.', 'Tôi dậy lúc 6 giờ mỗi sáng.'],
      ['Sự thật hiển nhiên, chân lý', 'Water boils at 100°C.', 'Nước sôi ở 100°C.'],
      ['Lịch trình, thời gian biểu cố định (tàu xe, giờ học)', 'The train leaves at 8:15.', 'Tàu khởi hành lúc 8:15.'],
      ['Trạng thái, cảm xúc, sở thích (động từ chỉ trạng thái)', 'She loves chocolate.', 'Cô ấy thích sô-cô-la.'],
    ],
    signals: ['always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'every day / week / year', 'on Mondays', 'once a week', 'in the morning'],
    examples: [
      ['My father works in a bank.', 'Bố tôi làm việc ở ngân hàng.'],
      ['They don\'t like spicy food.', 'Họ không thích đồ cay.'],
      ['Does she speak French?', 'Cô ấy có nói tiếng Pháp không?'],
      ['The sun rises in the east.', 'Mặt trời mọc ở hướng đông.'],
    ],
    notes: [
      'Ngôi thứ 3 số ít (he / she / it / danh từ số ít) thêm <b>-s</b>: work → works; thêm <b>-es</b> sau o, s, x, ch, sh: go → goes, watch → watches.',
      'Phụ âm + y → <b>-ies</b>: study → studies; nguyên âm + y chỉ thêm -s: play → plays. Ngoại lệ: have → <b>has</b>.',
      'Trạng từ tần suất (always, often, never…) đứng <b>trước</b> động từ thường và <b>sau</b> động từ to be: <i>She is always late. / She always comes late.</i>',
    ],
  },
  {
    id: 'pc', name: 'Present Continuous', vi: 'Hiện tại tiếp diễn', icon: '🏃', group: 'Hiện tại',
    short: 'Hành động đang diễn ra lúc nói hoặc quanh thời điểm nói',
    formula: { aff: 'S + am/is/are + V-ing', neg: 'S + am/is/are + not + V-ing', q: 'Am/Is/Are + S + V-ing?' },
    uses: [
      ['Hành động đang xảy ra ngay lúc nói', 'She is cooking dinner right now.', 'Cô ấy đang nấu bữa tối ngay bây giờ.'],
      ['Hành động đang diễn ra quanh thời điểm hiện tại (không nhất thiết đúng lúc nói)', 'I am learning Japanese this year.', 'Năm nay tôi đang học tiếng Nhật.'],
      ['Kế hoạch đã sắp xếp chắc chắn trong tương lai gần', 'We are meeting Tom tomorrow.', 'Ngày mai chúng tôi gặp Tom.'],
      ['Phàn nàn về thói quen (với always)', 'He is always losing his keys!', 'Anh ta cứ hay làm mất chìa khoá!'],
    ],
    signals: ['now', 'right now', 'at the moment', 'at present', 'currently', 'today', 'this week', 'Look! / Listen!', 'still'],
    examples: [
      ['Look! The children are playing in the garden.', 'Nhìn kìa! Bọn trẻ đang chơi trong vườn.'],
      ['I\'m not watching TV, I\'m studying.', 'Tôi không đang xem TV, tôi đang học bài.'],
      ['Are you listening to me?', 'Bạn có đang nghe tôi nói không?'],
      ['My brother is staying with us this month.', 'Tháng này anh tôi đang ở cùng chúng tôi.'],
    ],
    notes: [
      'Động từ chỉ trạng thái (<b>know, like, love, want, need, believe, understand, belong, seem</b>…) thường <b>không</b> dùng ở thì tiếp diễn: <i>I know him</i> (không nói <i>I am knowing</i>).',
      'Quy tắc thêm -ing: bỏ <b>e</b> câm (make → making), gấp đôi phụ âm cuối khi 1 nguyên âm + 1 phụ âm (run → running, sit → sitting), <b>ie → ying</b> (lie → lying).',
    ],
  },
  {
    id: 'pp', name: 'Present Perfect', vi: 'Hiện tại hoàn thành', icon: '✅', group: 'Hiện tại',
    short: 'Hành động đã xảy ra, còn liên hệ hoặc kết quả đến hiện tại',
    formula: { aff: 'S + have/has + V3 (quá khứ phân từ)', neg: 'S + have/has + not + V3', q: 'Have/Has + S + V3?' },
    uses: [
      ['Hành động bắt đầu trong quá khứ và kéo dài đến hiện tại (for / since)', 'I have lived here for ten years.', 'Tôi đã sống ở đây được mười năm.'],
      ['Hành động vừa mới xảy ra (just, recently)', 'She has just finished her homework.', 'Cô ấy vừa làm xong bài tập.'],
      ['Trải nghiệm trong đời, không nói rõ thời điểm (ever, never)', 'Have you ever been to Japan?', 'Bạn đã từng đến Nhật chưa?'],
      ['Hành động đã xong nhưng kết quả còn ảnh hưởng đến hiện tại', 'I have lost my keys, so I can\'t get in.', 'Tôi làm mất chìa khoá nên không vào được.'],
    ],
    signals: ['just', 'already', 'yet', 'ever', 'never', 'recently', 'lately', 'so far', 'for + khoảng thời gian', 'since + mốc thời gian', 'up to now', 'this is the first time'],
    examples: [
      ['We have already seen that movie.', 'Chúng tôi đã xem bộ phim đó rồi.'],
      ['He hasn\'t called me yet.', 'Anh ấy vẫn chưa gọi cho tôi.'],
      ['Have they arrived yet?', 'Họ đã đến chưa?'],
      ['She has worked here since 2019.', 'Cô ấy làm việc ở đây từ năm 2019.'],
    ],
    notes: [
      '<b>for</b> + khoảng thời gian (for two years); <b>since</b> + mốc thời gian (since 2020, since Monday).',
      '<b>already</b> trong câu khẳng định, <b>yet</b> trong câu phủ định / nghi vấn (đứng cuối câu).',
      'Không dùng với thời điểm xác định trong quá khứ (yesterday, last week, in 2010) – khi đó dùng Quá khứ đơn.',
      '<b>have been to</b> = đã từng đến (và đã về); <b>have gone to</b> = đã đi (chưa về).',
    ],
  },
  {
    id: 'ppc', name: 'Present Perfect Continuous', vi: 'Hiện tại hoàn thành tiếp diễn', icon: '⏳', group: 'Hiện tại',
    short: 'Hành động bắt đầu trong quá khứ, kéo dài liên tục đến hiện tại – nhấn mạnh quá trình',
    formula: { aff: 'S + have/has + been + V-ing', neg: 'S + have/has + not + been + V-ing', q: 'Have/Has + S + been + V-ing?' },
    uses: [
      ['Hành động bắt đầu trong quá khứ, còn tiếp diễn đến hiện tại – nhấn mạnh thời gian kéo dài', 'I have been waiting for two hours.', 'Tôi đã đợi suốt hai tiếng rồi.'],
      ['Hành động vừa kết thúc nhưng còn để lại dấu vết / kết quả rõ ràng ở hiện tại', 'It has been raining – the streets are wet.', 'Trời vừa mưa – đường phố ướt.'],
    ],
    signals: ['for', 'since', 'all day / all morning', 'how long…?', 'recently', 'lately', 'the whole week'],
    examples: [
      ['She has been studying English since 2020.', 'Cô ấy học tiếng Anh từ năm 2020 đến giờ.'],
      ['How long have you been working here?', 'Bạn làm việc ở đây được bao lâu rồi?'],
      ['They haven\'t been sleeping well lately.', 'Gần đây họ ngủ không ngon.'],
      ['You look tired. Have you been running?', 'Trông bạn mệt. Bạn vừa chạy à?'],
    ],
    notes: [
      'So với Hiện tại hoàn thành: HTHT nhấn mạnh <b>kết quả / số lượng</b> (<i>I have written 3 emails</i>), HTHTTD nhấn mạnh <b>quá trình / thời lượng</b> (<i>I have been writing emails all morning</i>).',
      'Động từ trạng thái (know, have = sở hữu, like…) không dùng dạng tiếp diễn → dùng HTHT: <i>I have known her for years.</i>',
    ],
  },
  {
    id: 'pas', name: 'Past Simple', vi: 'Quá khứ đơn', icon: '🕰️', group: 'Quá khứ',
    short: 'Hành động đã xảy ra và kết thúc tại một thời điểm xác định trong quá khứ',
    formula: { aff: 'S + V2 (V-ed / bất quy tắc) &nbsp;|&nbsp; S + was/were + ...', neg: 'S + did not + V &nbsp;|&nbsp; S + was/were not + ...', q: 'Did + S + V? &nbsp;|&nbsp; Was/Were + S + ...?' },
    uses: [
      ['Hành động đã xảy ra và chấm dứt ở một thời điểm xác định trong quá khứ', 'I visited Da Nang last summer.', 'Mùa hè năm ngoái tôi đã đến Đà Nẵng.'],
      ['Chuỗi hành động nối tiếp nhau trong quá khứ', 'She came home, took a shower and went to bed.', 'Cô ấy về nhà, tắm rồi đi ngủ.'],
      ['Thói quen trong quá khứ (nay không còn)', 'When I was a child, I played football every day.', 'Hồi nhỏ tôi chơi bóng đá mỗi ngày.'],
    ],
    signals: ['yesterday', 'last night / week / year', 'ago', 'in 2010', 'when I was young', 'then', 'at that time', 'the other day'],
    examples: [
      ['They moved to Hanoi in 2015.', 'Họ chuyển đến Hà Nội năm 2015.'],
      ['I didn\'t see him yesterday.', 'Hôm qua tôi không gặp anh ấy.'],
      ['Did you enjoy the party?', 'Bạn có thích bữa tiệc không?'],
      ['She was very tired after work.', 'Cô ấy rất mệt sau giờ làm.'],
    ],
    notes: [
      'Động từ có quy tắc thêm <b>-ed</b> (work → worked); tận cùng <b>e</b> chỉ thêm -d (live → lived); phụ âm + y → <b>-ied</b> (study → studied); gấp đôi phụ âm (stop → stopped).',
      'Động từ bất quy tắc phải học thuộc: go → went, see → saw, take → took, write → wrote, eat → ate, have → had…',
      'Câu phủ định / nghi vấn dùng <b>did</b> + động từ nguyên mẫu: <i>Did she go?</i> (không phải <i>Did she went?</i>).',
    ],
  },
  {
    id: 'pac', name: 'Past Continuous', vi: 'Quá khứ tiếp diễn', icon: '🌙', group: 'Quá khứ',
    short: 'Hành động đang diễn ra tại một thời điểm trong quá khứ',
    formula: { aff: 'S + was/were + V-ing', neg: 'S + was/were + not + V-ing', q: 'Was/Were + S + V-ing?' },
    uses: [
      ['Hành động đang diễn ra tại một thời điểm cụ thể trong quá khứ', 'At 8 p.m. last night, I was doing my homework.', 'Lúc 8 giờ tối qua tôi đang làm bài tập.'],
      ['Hành động đang diễn ra thì bị một hành động khác xen vào (when + QKĐ)', 'I was sleeping when the phone rang.', 'Tôi đang ngủ thì điện thoại reo.'],
      ['Hai hành động diễn ra song song trong quá khứ (while)', 'While she was cooking, he was reading.', 'Trong khi cô ấy nấu ăn thì anh ấy đọc sách.'],
    ],
    signals: ['at 8 o\'clock last night', 'at that time', 'at this time yesterday', 'while', 'when (+ QKĐ)', 'all day yesterday'],
    examples: [
      ['What were you doing at 10 a.m. yesterday?', 'Lúc 10 giờ sáng qua bạn đang làm gì?'],
      ['It was raining when we left.', 'Trời đang mưa khi chúng tôi rời đi.'],
      ['They weren\'t listening to the teacher.', 'Họ không nghe thầy giảng.'],
      ['While I was walking home, I met an old friend.', 'Khi đang đi bộ về nhà, tôi gặp một người bạn cũ.'],
    ],
    notes: [
      '<b>when</b> thường đi với hành động ngắn (QKĐ) xen vào; <b>while</b> đi với hành động dài (QKTD).',
      '<i>I was sleeping when the phone rang</i> (đang ngủ thì chuông reo) khác với <i>When the phone rang, I answered it</i> (hai hành động nối tiếp – đều QKĐ).',
    ],
  },
  {
    id: 'pap', name: 'Past Perfect', vi: 'Quá khứ hoàn thành', icon: '⏪', group: 'Quá khứ',
    short: 'Hành động xảy ra và hoàn tất trước một hành động / thời điểm khác trong quá khứ',
    formula: { aff: 'S + had + V3', neg: 'S + had not + V3', q: 'Had + S + V3?' },
    uses: [
      ['Hành động xảy ra trước một hành động khác trong quá khứ (hành động sau dùng QKĐ)', 'When I arrived, the train had already left.', 'Khi tôi đến, tàu đã rời đi rồi.'],
      ['Hành động xảy ra trước một thời điểm xác định trong quá khứ', 'By 2010, she had finished university.', 'Đến năm 2010, cô ấy đã tốt nghiệp đại học.'],
      ['Trong câu điều kiện loại 3 / câu ước về quá khứ', 'If I had known, I would have helped you.', 'Nếu tôi biết thì tôi đã giúp bạn rồi.'],
    ],
    signals: ['before', 'after', 'by the time', 'by + mốc quá khứ', 'already', 'until then', 'when (+ QKĐ)', 'as soon as'],
    examples: [
      ['She had never seen snow before she moved to Canada.', 'Cô ấy chưa từng thấy tuyết trước khi chuyển đến Canada.'],
      ['Had you eaten before you came?', 'Bạn đã ăn trước khi đến chưa?'],
      ['He hadn\'t studied, so he failed the test.', 'Anh ấy đã không học nên trượt bài kiểm tra.'],
      ['By the time we got there, the shop had closed.', 'Lúc chúng tôi tới nơi thì cửa hàng đã đóng cửa.'],
    ],
    notes: [
      'Luôn cần một "mốc" quá khứ khác (hành động QKĐ hoặc thời điểm) để so sánh: hành động <b>xảy ra trước</b> → QKHT, hành động <b>xảy ra sau</b> → QKĐ.',
      'Với <b>before / after</b> nghĩa đã rõ trình tự nên đôi khi có thể dùng QKĐ cho cả hai vế.',
    ],
  },
  {
    id: 'papc', name: 'Past Perfect Continuous', vi: 'Quá khứ hoàn thành tiếp diễn', icon: '⏮️', group: 'Quá khứ',
    short: 'Hành động kéo dài liên tục cho đến một thời điểm / hành động khác trong quá khứ',
    formula: { aff: 'S + had + been + V-ing', neg: 'S + had not + been + V-ing', q: 'Had + S + been + V-ing?' },
    uses: [
      ['Hành động diễn ra liên tục trước một hành động khác trong quá khứ – nhấn mạnh thời lượng', 'She had been working for 10 hours when the boss called.', 'Cô ấy đã làm việc 10 tiếng khi sếp gọi.'],
      ['Nguyên nhân của một tình trạng trong quá khứ', 'He was tired because he had been running.', 'Anh ấy mệt vì đã chạy bộ.'],
    ],
    signals: ['for', 'since', 'how long', 'before', 'until', 'by the time', 'when (+ QKĐ)', 'all day / night'],
    examples: [
      ['They had been waiting for an hour before the bus came.', 'Họ đã đợi một tiếng trước khi xe buýt đến.'],
      ['I had been studying all night, so I fell asleep in class.', 'Tôi đã học suốt đêm nên ngủ gật trong lớp.'],
      ['Had she been living there long before she moved?', 'Cô ấy đã sống ở đó lâu chưa trước khi chuyển đi?'],
      ['The ground was wet. It had been raining.', 'Mặt đất ướt. Trời đã mưa.'],
    ],
    notes: [
      'So với QKHT: QKHT nhấn kết quả (<i>had written 3 letters</i>), QKHTTD nhấn quá trình (<i>had been writing letters all morning</i>).',
      'Là "phiên bản quá khứ" của Hiện tại hoàn thành tiếp diễn: mốc so sánh lùi từ hiện tại về một thời điểm trong quá khứ.',
    ],
  },
  {
    id: 'fs', name: 'Future Simple', vi: 'Tương lai đơn', icon: '🔮', group: 'Tương lai',
    short: 'Quyết định tức thời, dự đoán, lời hứa, đề nghị',
    formula: { aff: 'S + will + V', neg: 'S + will not (won\'t) + V', q: 'Will + S + V?' },
    uses: [
      ['Quyết định đưa ra ngay lúc nói (không có kế hoạch trước)', 'It\'s cold. I will close the window.', 'Lạnh quá. Tôi sẽ đóng cửa sổ.'],
      ['Dự đoán dựa trên ý kiến, cảm nhận (think, believe, probably)', 'I think it will rain tomorrow.', 'Tôi nghĩ mai trời sẽ mưa.'],
      ['Lời hứa, đề nghị, yêu cầu, lời đe doạ', 'I will help you with your homework.', 'Tôi sẽ giúp bạn làm bài tập.'],
      ['Sự thật / sự việc chắc chắn xảy ra trong tương lai', 'She will be 20 next month.', 'Tháng sau cô ấy sẽ 20 tuổi.'],
    ],
    signals: ['tomorrow', 'next week / month / year', 'soon', 'in the future', 'in 2030', 'I think / I hope / I promise', 'probably', 'perhaps'],
    examples: [
      ['Don\'t worry, I will call you tonight.', 'Đừng lo, tối nay tôi sẽ gọi bạn.'],
      ['They won\'t come to the party.', 'Họ sẽ không đến bữa tiệc.'],
      ['Will you marry me?', 'Em sẽ lấy anh chứ?'],
      ['Robots will do most jobs in 50 years.', '50 năm nữa robot sẽ làm hầu hết công việc.'],
    ],
    notes: [
      '<b>will</b> = quyết định lúc nói / dự đoán chủ quan; <b>be going to</b> = kế hoạch có trước / dự đoán có căn cứ.',
      'Không dùng will trong mệnh đề thời gian (when, as soon as, until…) và if: <i>When he <b>comes</b>, I will tell him.</i>',
      '<b>Shall</b> dùng để đề nghị với I / we: <i>Shall we go?</i>',
    ],
  },
  {
    id: 'fc', name: 'Future Continuous', vi: 'Tương lai tiếp diễn', icon: '🌠', group: 'Tương lai',
    short: 'Hành động sẽ đang diễn ra tại một thời điểm trong tương lai',
    formula: { aff: 'S + will be + V-ing', neg: 'S + will not be + V-ing', q: 'Will + S + be + V-ing?' },
    uses: [
      ['Hành động sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai', 'At 9 tomorrow, I will be taking my exam.', 'Lúc 9 giờ sáng mai tôi sẽ đang thi.'],
      ['Hành động chắc chắn xảy ra theo lịch / thông lệ', 'I will be seeing her at the meeting on Monday.', 'Tôi sẽ gặp cô ấy ở buổi họp thứ Hai.'],
      ['Hỏi lịch sự về dự định của ai đó', 'Will you be using the car tonight?', 'Tối nay bạn có dùng xe không?'],
    ],
    signals: ['at this time tomorrow', 'at 8 o\'clock tomorrow', 'this time next week', 'all day tomorrow', 'when + HTĐ (mệnh đề thời gian)'],
    examples: [
      ['This time next week, we will be lying on the beach.', 'Giờ này tuần sau chúng ta sẽ đang nằm trên bãi biển.'],
      ['Don\'t call at 7 – I will be having dinner.', 'Đừng gọi lúc 7 giờ – tôi sẽ đang ăn tối.'],
      ['She won\'t be working tomorrow.', 'Ngày mai cô ấy sẽ không làm việc.'],
      ['Will they be staying at a hotel?', 'Họ sẽ ở khách sạn chứ?'],
    ],
    notes: [
      'Cấu trúc cố định <b>will be + V-ing</b> – không chia "be" theo ngôi.',
      'Động từ trạng thái không dùng dạng tiếp diễn → dùng Tương lai đơn: <i>I will know the result tomorrow.</i>',
    ],
  },
  {
    id: 'fp', name: 'Future Perfect', vi: 'Tương lai hoàn thành', icon: '🏁', group: 'Tương lai',
    short: 'Hành động sẽ hoàn tất trước một thời điểm / hành động khác trong tương lai',
    formula: { aff: 'S + will have + V3', neg: 'S + will not have + V3', q: 'Will + S + have + V3?' },
    uses: [
      ['Hành động sẽ hoàn thành trước một thời điểm trong tương lai', 'By 2030, they will have built the new airport.', 'Đến năm 2030 họ sẽ xây xong sân bay mới.'],
      ['Hành động sẽ hoàn thành trước một hành động khác trong tương lai', 'When you arrive, I will have finished cooking.', 'Khi bạn đến, tôi sẽ nấu xong rồi.'],
    ],
    signals: ['by + thời điểm tương lai', 'by the time', 'by then', 'before + mốc tương lai', 'in two years\' time'],
    examples: [
      ['By next June, I will have graduated.', 'Đến tháng Sáu tới tôi sẽ tốt nghiệp rồi.'],
      ['She will have left by the time you get here.', 'Cô ấy sẽ đi rồi lúc bạn đến đây.'],
      ['We won\'t have finished the report by Friday.', 'Chúng tôi sẽ không xong báo cáo trước thứ Sáu.'],
      ['Will you have completed the course by then?', 'Đến lúc đó bạn đã hoàn thành khoá học chưa?'],
    ],
    notes: [
      'Mệnh đề thời gian sau <b>by the time / when / before</b> dùng Hiện tại đơn, không dùng will.',
      'Là "phiên bản tương lai" của Hiện tại hoàn thành: <i>By 5 p.m. I <b>will have</b> finished</i> ↔ <i>Now I <b>have</b> finished</i>.',
    ],
  },
  {
    id: 'fpc', name: 'Future Perfect Continuous', vi: 'Tương lai hoàn thành tiếp diễn', icon: '🛤️', group: 'Tương lai',
    short: 'Hành động kéo dài liên tục đến một thời điểm trong tương lai – nhấn mạnh thời lượng',
    formula: { aff: 'S + will have been + V-ing', neg: 'S + will not have been + V-ing', q: 'Will + S + have been + V-ing?' },
    uses: [
      ['Nhấn mạnh hành động diễn ra liên tục cho đến một thời điểm trong tương lai', 'By next month, I will have been working here for 5 years.', 'Đến tháng sau tôi sẽ làm ở đây tròn 5 năm.'],
      ['Nguyên nhân dự kiến của một tình trạng trong tương lai', 'He will be tired – he will have been driving all day.', 'Anh ấy sẽ mệt – anh ấy lái xe cả ngày mà.'],
    ],
    signals: ['by + thời điểm tương lai + for + khoảng thời gian', 'by the time', 'by then', 'for + khoảng thời gian'],
    examples: [
      ['By 2030, she will have been teaching for 20 years.', 'Đến 2030, cô ấy sẽ dạy học được 20 năm.'],
      ['By the time the guests arrive, we will have been cooking for hours.', 'Khi khách tới, chúng ta sẽ nấu được vài tiếng rồi.'],
      ['They won\'t have been living here long by then.', 'Đến lúc đó họ vẫn chưa sống ở đây được lâu.'],
      ['Will you have been studying English for 10 years by next year?', 'Đến năm sau bạn học tiếng Anh được 10 năm rồi phải không?'],
    ],
    notes: [
      'Ít dùng trong giao tiếp hằng ngày; hầu như luôn đi với <b>for + khoảng thời gian</b> và một mốc "by…".',
      'Động từ trạng thái → dùng Tương lai hoàn thành: <i>By June, I will have known him for a year.</i>',
    ],
  },
  {
    id: 'nf', name: 'Near Future (be going to)', vi: 'Tương lai gần', icon: '🎯', group: 'Tương lai',
    short: 'Kế hoạch / dự định có sẵn, dự đoán có căn cứ',
    formula: { aff: 'S + am/is/are + going to + V', neg: 'S + am/is/are + not + going to + V', q: 'Am/Is/Are + S + going to + V?' },
    uses: [
      ['Kế hoạch, dự định đã có từ trước khi nói', 'We are going to visit Hue next month.', 'Tháng sau chúng tôi sẽ đi thăm Huế.'],
      ['Dự đoán dựa trên dấu hiệu, bằng chứng ở hiện tại', 'Look at those clouds! It is going to rain.', 'Nhìn mây kìa! Trời sắp mưa.'],
    ],
    signals: ['tomorrow', 'next week', 'tonight', 'soon', 'Look! (dấu hiệu)', 'I plan to…', 'intend to'],
    examples: [
      ['I am going to study abroad next year.', 'Năm sau tôi sẽ đi du học.'],
      ['She isn\'t going to buy that car.', 'Cô ấy sẽ không mua chiếc xe đó.'],
      ['Are you going to tell him the truth?', 'Bạn định nói sự thật với anh ấy chứ?'],
      ['Be careful! You are going to fall.', 'Cẩn thận! Bạn sắp ngã đấy.'],
    ],
    notes: [
      '<b>be going to</b> (kế hoạch có trước, dự đoán có bằng chứng) ≠ <b>will</b> (quyết định lúc nói, dự đoán chủ quan).',
      'Trong văn nói thường rút gọn thành <i>gonna</i> (<i>I\'m gonna go</i>) – không dùng trong văn viết trang trọng.',
      'Với <b>go / come</b> có thể dùng Hiện tại tiếp diễn thay vì going to go: <i>I\'m going to the cinema tonight.</i>',
    ],
  },
];

export const TENSE_BY_ID = Object.fromEntries(TENSES.map(t => [t.id, t]));
export const LEVELS = [
  { id: 1, name: 'Cơ bản', icon: '🌱', desc: 'Câu khẳng định, động từ quen thuộc, dấu hiệu rõ ràng' },
  { id: 2, name: 'Khó', icon: '🔥', desc: 'Phủ định, nghi vấn, động từ bất quy tắc, dấu hiệu ẩn' },
  { id: 3, name: 'Siêu khó', icon: '💀', desc: 'Phân biệt các thì trong câu phức, tự gõ đáp án, tìm câu đúng' },
];
