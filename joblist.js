// HTML要素の取得
const fileInput = document.getElementById('fileInput');
const toggleViewButton = document.getElementById('toggleView');
const configWindow = document.getElementById('configWindow');
const filterWindow = document.getElementById('filterWindow');
const checkboxContainer = document.getElementById('checkboxContainer');
const filterOptionsContainer = document.getElementById("filterOptions");
const outputTable = document.getElementById('output');

// グローバル変数
let headers = [];//表のヘッダ名の配列
let data = [];//表のヘッダ以外の二次元配列
let isDetailedView = true; // 詳細表示かどうかのフラグ
let filterInput = "";  //適応時のフィルタ式
let executionFilterData = [];  //適応時のtrue,false配列
let filterCheckboxArrangement = [];  //チェックボックス操作用二次元配列
let filterCheckboxArrangementChecked = [],filterCheckboxArrangementSave = [];  //チェックボックスがチェックされているかの二次元配列  
let columnMapping = {};   //表の列名と列数を紐付け({列名:列数})
   
// ファイル選択時の処理
fileInput.addEventListener('change', handleFileSelect);

// 表データの表示処理
function displayTable(headers, data) {
    outputTable.innerHTML = '';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;
        th.dataset.index = index; // ヘッダーにインデックスを保存
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    outputTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach((_, cellIndex) => {
            const td = document.createElement('td');
            const cell = row[cellIndex];
            if (cell === undefined || cell === null || cell === '') {
                td.innerHTML = '　';
                td.classList.add('empty-cell');
            } else {
                td.textContent = cell;
            }
            tr.appendChild(td);
        });
        tr.addEventListener("click",addList);
        tbody.appendChild(tr);
    });
    outputTable.appendChild(tbody);
    if(!isDetailedView){
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            if (!checkbox.checked) {
                for(let row=0;row<outputTable.rows.length;row++)
                    outputTable.rows[row].cells[index].style.display="none";
            }
        });
    }
    for(let row=0;row<outputTable.rows.length;row++){
        if(listTable.innerHTML.includes(outputTable.rows[row].innerHTML))
            outputTable.rows[row].removeEventListener("click",addList);
    }
}

// 詳細表示と簡易表示の切り替え
function toggleViewFunc() {
    isDetailedView = !isDetailedView; // 表示モードを切り替え
    const checkboxes = document.getElementsByName("displayContent");
    for(let row=0;row<outputTable.rows.length;row++){
        for(let cell=0;cell<outputTable.rows[row].cells.length;cell++)
            outputTable.rows[row].cells[cell].style.display= (isDetailedView||checkboxes[cell].checked)?"":"none";
    }
    for(let row=0;row<listTable.rows.length;row++){
        for(let cell=0;cell<listTable.rows[row].cells.length;cell++)
            listTable.rows[row].cells[cell].style.display= (isDetailedView||checkboxes[cell].checked)?"":"none";
    }

    // ボタンのテキストを更新
    toggleViewButton.textContent = isDetailedView ? '簡易表示に切り替え' : '詳細表示に切り替え';
}

// Excelファイルを読み込む処理
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const dataArray = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataArray, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        //フィルタ式の入力で使う半角の括弧や空白があれば全角に変換
        json.forEach((row,rowIndex) =>{
            row.forEach((cell,cellIndex) =>{
                if(typeof cell === "string" || cell instanceof String)
                    json[rowIndex][cellIndex] = replaceHalfWidthBrackets(cell);
                if(json[0][cellIndex]=="対象学科" || json[0][cellIndex]=="専攻指定")
                    json[rowIndex][cellIndex] = department(json[rowIndex][cellIndex]);
            });
        });
        headers = json[0];
        data = json.slice(1);
        displayTable(headers, data);
        generateConfigOptions(headers);
        control();
    };
    reader.readAsArrayBuffer(file);
}

function control(){
    generateFilterOptions(headers);
    generateSortOptions(headers); // ソート可能な列を動的に生成
    columnMapping = {};   //表の列名と列数を紐付け({列名:列数})
    for(let i=0;i<outputTable.rows[0].cells.length;i++)
        columnMapping[outputTable.rows[0].cells[i].firstChild.data] = i;
}


// 表示内容設定のチェックボックス生成
function generateConfigOptions(headers) {
    checkboxContainer.innerHTML = '';
    headers.forEach((header, index) => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.name = 'displayContent';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(header));
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(document.createElement('br')); // 見やすさのために改行
    });
}

// 表示内容設定の適用ボタン
function applyConfig() {
    configWindow.style.display = 'none';
    isDetailedView = true;
    toggleViewFunc();
}

configWindow.style.display = 'none';
// 表示内容設定ウィンドウを開く
function toggleConfig() {
    zIndexFunc(configWindow);
    (configWindow.style.display === 'none') ? configWindow.style.display = 'block' : configWindow.style.display = 'none';
}


// ソートウィンドウのボタン
const applySortButton = document.getElementById('applySort');
const sortWindow = document.getElementById('sortWindow');
const sortOptionsContainer = document.getElementById('sortOptions');
sortWindow.style.display = 'none';

// ソートウィンドウを開く
function toggleSort() {
    zIndexFunc(sortWindow);
    (sortWindow.style.display === 'none') ? sortWindow.style.display = 'block' : sortWindow.style.display = 'none';
}

// ソートウィンドウのオプションを生成
function generateSortOptions(headers) {
    sortOptionsContainer.innerHTML = ''; // 既存のオプションをクリア
    sortIndex = 0;


    headers.forEach((header, index) => {
        if (sortArrangement.includes(header)) {
            sortOptionsContainer.appendChild(document.createTextNode(`${header} : `));
            const ascLabel = document.createElement('label');
            const descLabel = document.createElement('label');


            const ascButton = document.createElement('input');
            ascButton.type = 'radio';
            ascButton.name = `sortColumn_${index}_sortIndex_${sortIndex}`;
            ascButton.value = 'asc';
            ascLabel.addEventListener("mouseup", clearRadioButton);
            ascLabel.appendChild(ascButton);
            ascLabel.appendChild(document.createTextNode('昇順'));
            sortOptionsContainer.appendChild(ascLabel);
           
            const descButton = document.createElement('input');
            descButton.type = 'radio';
            descButton.name = `sortColumn_${index}_sortIndex_${sortIndex}`;
            descButton.value = 'desc';
            descLabel.addEventListener("mouseup", clearRadioButton);
            descLabel.appendChild(descButton);
            descLabel.appendChild(document.createTextNode('降順'));
            sortOptionsContainer.appendChild(descLabel);


            const span=document.createElement("span");
            const text=document.createElement("input");
            const plusButton=document.createElement("input");
            const minusButton=document.createElement("input");
            text.type="text";
            plusButton.type="button";
            minusButton.type="button";
            text.value=1;
            plusButton.value="+";
            minusButton.value="-";
            text.size=1;
            plusButton.addEventListener("click",function(){this.parentNode.firstChild.value++;});
            minusButton.addEventListener("click",function(){this.parentNode.firstChild.value--;});
            span.appendChild(text);
            span.appendChild(plusButton);
            span.appendChild(minusButton);
            sortOptionsContainer.appendChild(document.createTextNode('　　優先順位'));
            sortOptionsContainer.appendChild(span);


            sortOptionsContainer.appendChild(document.createElement('br'));
            sortIndex++;
        }
    });
}

//選択済みラジオボタンをクリックで未選択に
function clearRadioButton(){
    const radioButton = this.firstChild;
    if(radioButton.checked){
        setTimeout(func =()=>{
            radioButton.checked = false;
        },100)
    }
}

// ソート適用ボタンの処理
applySortButton.addEventListener('click', function () {
    sortWindow.style.display = 'none';// ソートウィンドウを非表示に
    const selectedSort = getSelectedSortOption(); // 選択されたソートオプションを取得
    if (selectedSort) {
        selectedSort.forEach((element)=>{
     	   sortTableByColumn(element.index, element.order); // 指定された列でソート
        }); // 指定された列でソート
    }
});


// 選択されたソートオプションを取得
function getSelectedSortOption() {
    const sortOptions = sortOptionsContainer.querySelectorAll('input[type="radio"]:checked');
    const priority = sortOptionsContainer.querySelectorAll('input[type="text"]');
    if (sortOptions.length === 0) return null;
   
    let sortData = [];
    for (let i = 0; i < sortOptions.length; i++) {
        const radio = sortOptions[i];
        const columnIndex = parseInt(radio.name.split('_')[1], 10);
        const sortIndex =  parseInt(radio.name.split('_')[3], 10);
        const sortOrder = radio.value;
        sortData.push({ index: columnIndex, order: sortOrder, sortIndex:sortIndex });
    }
    sortData.sort((a,b)=>{return priority[b.sortIndex].value - priority[a.sortIndex].value;});
    return sortData;
}


// ソート処理
function sortTableByColumn(columnIndex, order) {
    data.sort((a, b) => {
        const valA = a[columnIndex] || '';
        const valB = b[columnIndex] || '';
       
        if (!isNaN(valA) && !isNaN(valB)) {
            // 数値ソート
            return order === 'asc' ? valA - valB : valB - valA;
        } else {
            // 文字列ソート
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });
    displayTable(headers, data); // ソート後にテーブルを再描画
    processFilter();
    console.log("「"+outputTable.rows[0].cells[columnIndex].innerHTML+"」を「"+order+"」でソートしました。")
}

filterWindow.style.display = 'none';
// フィルタ設定ウィンドウの表示切り替え  
function toggleFilterWindow() {
    zIndexFunc(filterWindow);
    (filterWindow.style.display === 'none') ? filterWindow.style.display = 'block' : filterWindow.style.display = 'none';  
}  
// フィルタ設定ウィンドウの非表示(適用状態に戻す)  
function closeFilterWindow(){  
    filterWindow.style.display = "none";  
    if(filterCheckboxArrangementSave.length){
        for(let i=0;i<filterCheckboxArrangement.length;i++){
            for(let j=0;j<filterCheckboxArrangement[i].length;j++)
                filterCheckboxArrangement[i][j].checked = filterCheckboxArrangementSave[i][j];
        }
        document.getElementById('filterInput').value = filterInput;  
    }
}  

// フィルタを適応する  
function applyFilter() {  
    filterInput = document.getElementById('filterInput').value;//フィルタ式入力欄の取得  
    if(filterInput == "/list"){//リストのテスト用
        list.style.display = "block"; 
        return;
    }
    filterCheckboxArrangementSave = filterCheckboxArrangementChecked;
    console.log("フィルタ条件:", filterInput);
    processFilter();
}
//フィルタ処理
function processFilter(){
    let filterArrangement = tokenize(filterInput);console.log("トークン化:",filterArrangement);//式を分割してフィルタ用配列に入れる
    let filterArrangementIndex = 0;  
    let priority = 0;//優先順位  
    let filterObject = [];//優先順位とフィルタ用配列のインデックスを紐付け 
    //エレメントをフィルタ用データに変換 & ANDとORに優先順位を付ける  
    while(filterArrangementIndex < filterArrangement.length){  
        if(filterArrangement[filterArrangementIndex] === '('){  
            priority++;  
            filterArrangement.splice(filterArrangementIndex,1);  
            continue;  
        }else if(filterArrangement[filterArrangementIndex] === ')'){  
            priority--;  
            filterArrangement.splice(filterArrangementIndex,1);  
            continue;  
        }else if(filterArrangement[filterArrangementIndex] === 'OR' || filterArrangement[filterArrangementIndex] === 'AND' || filterArrangement[filterArrangementIndex] === 'NOT'){  
            filterObject.push({index:filterArrangementIndex,priority:priority});  
        }else{  
            filterArrangement[filterArrangementIndex]=EDConversion(filterArrangement[filterArrangementIndex]);
            if(filterArrangement[filterArrangementIndex]=="ERROR")
                return;
        }  
        filterArrangementIndex++;  
    }  
   
    //NOTの優先順位を上げる
    filterObject.forEach((object,index)=>{
        if(filterArrangement[object.index]==="NOT")
            filterObject[index].priority+=0.5;
    });
    //優先順位によって並び替え  
    filterObject.sort((a,b)=>{return b.priority-a.priority});  
   
    //ANDとORとNOTの実行  
   
    for(let filterObjectIndex = 0;filterObjectIndex<filterObject.length;filterObjectIndex++){  
        let up = down = filterObject[filterObjectIndex].index;  

        do{  
            up++;  
            if(up >= filterArrangement.length){  
                alert("式の構成に問題があります。\nコンソールを確認してください。");  
                return;  
            }  
        }while(filterArrangement[up]==='');  
        if(filterArrangement[up]==="AND" || filterArrangement[up]==="OR" || filterArrangement[up]==="NOT"){
            alert("式の構成に問題があります。\nコンソールを確認してください。");
            return;
        }
        if(filterArrangement[down]==="NOT"){
            filterArrangement[down] = notfilter(filterArrangement[up]);
        }else{
            do{  
                down--;  
                if(down < 0){  
                    alert("式の構成に問題があります。\nコンソールを確認してください。");  
                    return;  
                }  
            }while(filterArrangement[down]==='');  
            if(filterArrangement[down]==="AND" || filterArrangement[down]==="OR" || filterArrangement[down]==="NOT"){
                alert("式の構成に問題があります。\nコンソールを確認してください。");
                return;
            }
            filterArrangement[down] = (filterArrangement[filterObject[filterObjectIndex].index]==="OR") ? orfilter(filterArrangement[up], filterArrangement[down]) : andfilter(filterArrangement[up], filterArrangement[down]);  
            filterArrangement[filterObject[filterObjectIndex].index]="";
        }
        filterArrangement[up]="";  
       
    }   
    executionFilterData = filterArrangement[0];
    if(executionFilterData){
        executionFilterData.unshift(true);
    }else{
        executionFilterData = [];
        for(let len=0;len<outputTable.rows.length;len++)
            executionFilterData.push(true);
    }
    executionFilterData.forEach((element,index)=>{ 
        outputTable.rows[index].style.display = (element)?"":"none";
    });
}

function tokenize(expression) {  
    const tokens = [];  
    const regex = /(\(|\)|AND|OR|NOT|[^ ]+_\w+_[^\(\) ]+)/g;  
    let match;  

    while ((match = regex.exec(expression)) !== null) {  
        tokens.push(match[0]);  
    }  
    return tokens;  
}  

function EDConversion(condition) {  
    // 基本構造：列_比較方法_内容  
    const [column, comparator, value] = condition.split("_");  

    // 列のインデックス取得  
    let columnIndex;  
    if (column === "all" || column === "a") {  
        columnIndex = "all";  
    } else if (column.startsWith("columns[")) {  
        columnIndex = parseInt(column.match(/\d+/)[0]);
    } else if(columnMapping.hasOwnProperty(column)){  
        columnIndex = columnMapping[column];  
    } else {
        alert("列「"+column+"」が見つかりません");
        return "ERROR";
    }
   
    if(comparator === "contains" || comparator === "c")  
        return containsFunc(columnIndex, value);  
    else if(comparator === "exact" || comparator === "e")  
        return exactFunc(columnIndex, value);  
    else if(comparator === "range" || comparator === "r")  
        return rangeFunc(columnIndex, value);  
    else{  
        alert("比較方法「"+comparator+"」に問題があります。");  
        return "ERROR";  
    }  
}  

function containsFunc(columnIndex, value){  
    let filterData=[],judgment;  
    for(let row = 1;row < outputTable.rows.length;row++){  
        if(columnIndex === "all"){  
            judgment = false;  
            for(let column = 0;column < outputTable.rows[row].cells.length;column++){  
                if(outputTable.rows[row].cells[column].firstChild.data.includes(value)){  
                    judgment = !judgment;  
                    break;  
                }  
            }  
            filterData.push(judgment);  
        }  
        else{  
            (outputTable.rows[row].cells[columnIndex].firstChild.data.includes(value)) ? filterData.push(true) : filterData.push(false);  
        }  
    }  
    return filterData;  
}  
function exactFunc(columnIndex, value){  
    let filterData=[],judgment;  
    for(let row = 1;row < outputTable.rows.length;row++){  
        if(columnIndex === "all"){  
            judgment = false;  
            for(let column = 0;column < outputTable.rows[row].cells.length;column++){  
                if(outputTable.rows[row].cells[column].firstChild.data == value){  
                    judgment = !judgment;  
                    break;  
                }  
            }  
            filterData.push(judgment);  
        }  
        else{  
            (outputTable.rows[row].cells[columnIndex].firstChild.data == value) ? filterData.push(true) : filterData.push(false);
        }  
    }  
    return filterData;  
}  
function rangeFunc(columnIndex, value){  
    const regexp = /^\d*:\d*$/;    
    let most = [];  
    if(regexp.test(value)){  
        most = value.split(":");  
    }else{  
        alert("rangeの内容「"+value+"」が実行出来ません");  
        return "ERROR";  
    }  
    (most[0] == "") ? most[0] = Number.MIN_VALUE : most[0]=Number.parseFloat(most[0]);  
    (most[1] == "") ? most[1] = Number.MAX_VALUE : most[1]=Number.parseFloat(most[1]);  
    let filterData=[],judgment;  
    for(let row = 1;row < outputTable.rows.length;row++){    
        if(columnIndex === "all"){    
            judgment = false;    
            for(let column = 0;column < outputTable.rows[row].cells.length;column++){    
                if(outputTable.rows[row].cells[column].firstChild.data >= most[0] && outputTable.rows[row].cells[column].firstChild.data < most[1]){    
                    judgment = !judgment;    
                    break;    
                }    
            }    
        filterData.push(judgment);    
        }else{  
            if(outputTable.rows[row].cells[columnIndex].firstChild.data >= most[0] && outputTable.rows[row].cells[columnIndex].firstChild.data < most[1]){  
                filterData.push(true);  
            }else{  
            filterData.push(false);    
            }  
        }    
    }    
    return filterData;  
}  

function orfilter(up,down){  
    let middle=[];  
    for(let i = 0;i < up.length && i < down.length;i++)  
        (up[i]||down[i]) ? middle.push(true) : middle.push(false);  
    return middle;  
}  
function andfilter(up,down){  
    let middle=[];  
    for(let i = 0;i < up.length && i < down.length;i++)  
        (up[i]&&down[i]) ? middle.push(true) : middle.push(false);  
    return middle;  
}  
function notfilter(subject){
    subject.forEach((_,index)=>{
        subject[index] = !subject[index];
    })
    return subject;
}


function generateFilterOptions(headers) {  
    filterOptionsContainer.innerHTML = '';  
    let index = 0;  
    headers.forEach(function(header,cellIndex){  
        if(contains.hasOwnProperty(header)){  
            filterCheckboxArrangement.push([]);  
            const title = document.createElement('b');
            title.align = "center";
            title.appendChild(document.createTextNode(header));
            filterOptionsContainer.appendChild(title);  
            const selectionButton = document.createElement('button');
            selectionButton.setAttribute('onclick',"allSelection('"+header+"');filterCheckboxChecker()");
            selectionButton.innerText = "全選択";
            filterOptionsContainer.appendChild(selectionButton);
            const cancellationButton = document.createElement('button');
            cancellationButton.setAttribute('onclick',"allCancellation('"+header+"');filterCheckboxChecker()");
            cancellationButton.innerText = "全解除";
            filterOptionsContainer.appendChild(cancellationButton);
            filterOptionsContainer.appendChild(document.createElement('br'));
            const notlabel = document.createElement('label');
            const notcheckbox = document.createElement('input');
            notcheckbox.type = 'checkbox';
            notcheckbox.onchange = filterCheckboxChecker;
            notcheckbox.name = header;
            notcheckbox.value = "NOT(";  
            for(let i = 0;i<contains[header].length;i++){  
                const label = document.createElement('label');  
                const checkbox = document.createElement('input');  
                checkbox.type = 'checkbox';  
                checkbox.onchange = filterCheckboxChecker;  
                checkbox.checked = false;  
                checkbox.name = header;  
                checkbox.value = header+"_contains_"+contains[header][i];
                (i==0) ? notcheckbox.value += checkbox.value : notcheckbox.value += " OR "+checkbox.value;    
                filterCheckboxArrangement[index].push(checkbox);  
                label.appendChild(checkbox);  
                label.appendChild(document.createTextNode(contains[header][i]));  
                filterOptionsContainer.appendChild(label);    
                filterOptionsContainer.appendChild(document.createElement('br'));
            }  
            notcheckbox.value += ")";
            filterCheckboxArrangement[index].push(notcheckbox);
            notlabel.appendChild(notcheckbox);
            notlabel.appendChild(document.createTextNode("その他"));
            filterOptionsContainer.appendChild(notlabel);
            filterOptionsContainer.appendChild(document.createElement('br'));
            filterOptionsContainer.appendChild(document.createElement('br'));  
            index++;  
        }  

        if(exact.hasOwnProperty(header)){  
            exact[header] = [];
            for(let rowIndex=1;rowIndex<outputTable.rows.length;rowIndex++){
                if(!exact[header].includes(outputTable.rows[rowIndex].cells[cellIndex].firstChild.data))
                    exact[header].push(outputTable.rows[rowIndex].cells[cellIndex].firstChild.data);
            }
            filterCheckboxArrangement.push([]);  
            const title = document.createElement('b');
            title.align = "center";
            title.appendChild(document.createTextNode(header))
            filterOptionsContainer.appendChild(title);  
            const selectionButton = document.createElement('button');
            selectionButton.setAttribute('onclick',"allSelection('"+header+"');filterCheckboxChecker()");
            selectionButton.innerText = "全選択";
            filterOptionsContainer.appendChild(selectionButton);
            const cancellationButton = document.createElement('button');
            cancellationButton.setAttribute('onclick',"allCancellation('"+header+"');filterCheckboxChecker()");
            cancellationButton.innerText = "全解除";
            filterOptionsContainer.appendChild(cancellationButton);
            filterOptionsContainer.appendChild(document.createElement('br'));    
            for(let i = 0;i<exact[header].length;i++){  
                const label = document.createElement('label');  
                const checkbox = document.createElement('input');  
                checkbox.type = 'checkbox';  
                checkbox.onchange = filterCheckboxChecker;  
                checkbox.checked = false;  
                checkbox.name = header;  
                checkbox.value = header+"_exact_"+exact[header][i];  
                filterCheckboxArrangement[index].push(checkbox);  
                label.appendChild(checkbox);  
                label.appendChild(document.createTextNode(exact[header][i]));  
                filterOptionsContainer.appendChild(label);  
                filterOptionsContainer.appendChild(document.createElement('br'));  
            }  
            filterOptionsContainer.appendChild(document.createElement('br'));
            index++;  
        }  

        if(range.hasOwnProperty(header)){  
            filterCheckboxArrangement.push([]);  
            const title = document.createElement('b');
            title.align = "center";
            title.appendChild(document.createTextNode(header))
            filterOptionsContainer.appendChild(title);  
            const selectionButton = document.createElement('button');
            selectionButton.setAttribute('onclick',"allSelection('"+header+"');filterCheckboxChecker()");
            selectionButton.innerText = "全選択";
            filterOptionsContainer.appendChild(selectionButton);
            const cancellationButton = document.createElement('button');
            cancellationButton.setAttribute('onclick',"allCancellation('"+header+"');filterCheckboxChecker()");
            cancellationButton.innerText = "全解除";
            filterOptionsContainer.appendChild(cancellationButton);
            filterOptionsContainer.appendChild(document.createElement('br'));    
            for(let i = 0;i<range[header].length;i++){  
                const label = document.createElement('label');  
                const checkbox = document.createElement('input');  
                checkbox.type = 'checkbox';  
                checkbox.onchange = filterCheckboxChecker;  
                checkbox.checked = false;  
                checkbox.name = header;  
                checkbox.value = header+"_range_"+range[header][i];  
                filterCheckboxArrangement[index].push(checkbox);  
                label.appendChild(checkbox);  
                let most = range[header][i].split(':');  
                if(!(most[0]=="" || most[1]==""))
                    label.appendChild(document.createTextNode(most[0]+"以上"+most[1]+"未満"));  
                else if(most[0]=="")
                    label.appendChild(document.createTextNode(most[1]+"未満"));
                else
                    label.appendChild(document.createTextNode(most[0]+"以上"));
                filterOptionsContainer.appendChild(label);
                filterOptionsContainer.appendChild(document.createElement('br'));    
            }  
            filterOptionsContainer.appendChild(document.createElement('br'));  
            index++;  
        }  
    });  
}  

function filterCheckboxChecker(){  
    filterCheckboxArrangementChecked = [];  
    let filterCheckboxInputs = '';  
    let filterCheckboxInput
    for(let index1=0;index1<filterCheckboxArrangement.length;index1++){  
        filterCheckboxArrangementChecked.push([]);  
        for(let index2=0;index2<filterCheckboxArrangement[index1].length;index2++)
            filterCheckboxArrangementChecked[index1].push(filterCheckboxArrangement[index1][index2].checked);  

        if(filterCheckboxArrangementChecked[index1].includes(true)){  
            if(filterCheckboxInputs=='')
                filterCheckboxInput = '(';
            else
                filterCheckboxInput = " AND (";  
            for(let index2=0;index2<filterCheckboxArrangement[index1].length;index2++){  
                if(filterCheckboxArrangement[index1][index2].checked){  
                    if(!(filterCheckboxInput=='(' || filterCheckboxInput==" AND ("))  
                        filterCheckboxInput+=" OR ";    
                    filterCheckboxInput+=filterCheckboxArrangement[index1][index2].value;  
                }
            }
            filterCheckboxInput+=')';  
            filterCheckboxInputs+=filterCheckboxInput;  
        }  
    }  
    document.getElementById('filterInput').value = filterCheckboxInputs;
}

function allSelection(checkboxName){
    const checkboxes = document.querySelectorAll('input[name='+checkboxName+']');
    checkboxes.forEach((checkbox)=>{
        checkbox.checked = true;
    });
}
function allCancellation(checkboxName){
    const checkboxes = document.querySelectorAll('input[name='+checkboxName+']');
    checkboxes.forEach((checkbox)=>{
        checkbox.checked = false;
    });
}

function replaceHalfWidthBrackets(str) {
    return str
        .replace(/\(/g, '（')
        .replace(/\)/g, '）')
        .replace(/\s/g, '　');
}
function department(str){
    return str
        .replace("Ｚ","Z")
        .replace("Ｐ","P")
        .replace("Ｔ","T")
        .replace("Ｍ","M")
        .replace("ｍ","m")
        .replace("ｒ","r")
        .replace("Ｅ","E")
        .replace("ｅ","e")
        .replace("ｉ","i")
        .replace("Ｄ","D")
        .replace("Ｃ","C")
        .replace("Ａ","A")
        .replace("I","i");
}

//ツールチップ
window.addEventListener('DOMContentLoaded', (event) => {

    const isMobile = (() => {
        const mediaQueryList = window.matchMedia("(pointer:coarse), (hover:none)");
        return mediaQueryList.matches;
    })();

    const setToolTip = () => {
        document.querySelectorAll('span#filterExplantion[title]').forEach((elm) => {
            elm.addEventListener('click', function(event) {
                const titleElms = this.querySelectorAll('.title');
                if (titleElms.length) {
                    titleElms.forEach((elm) => {
                        elm.remove();
                    });
                } else {
                    const title = this.getAttribute('title').split("\n");
                    //if (title.length) {
                        const spanElm = document.createElement('span');
                        spanElm.classList.add('title');
                        title.forEach((title)=>{
                        spanElm.appendChild(document.createTextNode(title));
                        spanElm.appendChild(document.createElement("br"));
                        });
                        this.appendChild(spanElm);
                    //}
                }
            });
        });
    };
    if (isMobile) {
        setToolTip();
    }
});


filterWindow.addEventListener("click", zIndexClickFunc);
sortWindow.addEventListener("click", zIndexClickFunc);
configWindow.addEventListener("click", zIndexClickFunc);
function zIndexClickFunc(e){
    eleid=e.target.id;
    if(eleid.includes("Window"))
        zIndexFunc(document.getElementById(eleid));
}
function zIndexFunc(window) {
    filterWindow.style.zIndex=1000;
    sortWindow.style.zIndex=1000;
    configWindow.style.zIndex=1000;
    window.style.zIndex=2000;
}

//リストのテスト用
const listTable = document.getElementById("listTable");
const list = document.getElementById("list");
function addList(){
    this.removeEventListener("click",addList);
    const listRow = this.cloneNode(true);
    listRow.addEventListener("click",removeList);
    listTable.appendChild(listRow);
}
function removeList(){
    for(let row=0;row<outputTable.rows.length;row++){
        if(outputTable.rows[row].innerHTML == this.innerHTML){
            outputTable.rows[row].addEventListener("click",addList);
            break;
        }
    }
    this.remove();
}
function closeList(){
    list.style.display = 'none'
}
