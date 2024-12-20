/*フィルタ*/


//部分一致
/*
プロパティにチェックボックスを作るヘッダー、バリューに作るチェックボックスの内容を配列に入れて書く。
どのチェックボックスにも当てはまらない行を表示する式を書いてくれるその他のチェックボックスが自動的に作られる。
*/
contains={  
  "専攻指定":["Z","P","T","M","m","r","E","e","i","D","C","A"]
};  
   
//完全一致
/*
プロパティにチェックボックスを作るヘッダー、バリューに空の配列を書く。
列の内容から自動でチェックボックスを作る。
*/
let exact={    
   "産業分類（大分類）":[],
   "職業分類（大分類）":[],
   "公開区分（指・公）":[]
};  
   
//数値範囲
/*
プロパティにチェックボックスを作るヘッダー、バリューに作るチェックボックスの内容を配列に入れて書く。
内容の書き方･･･形:数値1:数値2 全て文字列で書く。数値1以上数値2未満となる。
              数値1を書かない場合は下限が、数値2を書かない場合は上限がなくなる。
              (±1.7976931348623157×10³⁰⁸を超えた時のエラー処理無し)
*/
range={  
  "毎月の賃金（月額）":[
    ":140000",
    "140000:160000",
    "160000:180000",
    "180000:200000",
    "200000:220000",
    "220000:240000",
    "240000:"
  ]
};  

/*ソート*/
//ソート可能にする列の名前を入れる
sortArrangement = [
  'No', 
  '従業員数（企業全体）', 
  '従業員数（就業場所）', 
  '求人数', 
  '毎月の賃金（月額）', 
  '年間休日数', 
  '産業分類（コード）', 
  '職業分類（コード）'
];
