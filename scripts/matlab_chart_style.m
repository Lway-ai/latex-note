function s = matlab_chart_style(ax)
%MATLAB_CHART_STYLE  Apply the shared technical-note chart style.
%   Returns style constants and optionally applies them to an axes object.
%
%   用法:
%     st = matlab_chart_style();                    % 只取样式常量
%     plot(f, y1, 'Color', st.colors(1,:), 'LineWidth', st.line_width);
%     plot(f, y2, 'Color', st.colors(2,:), 'LineWidth', st.line_width);
%     matlab_chart_style(gca);                      % 应用到坐标轴(字体/网格/轴线)
%     xlabel('Frequency (GHz)'); ylabel('S21 (dB)');
%     legend('SP-debug','SP-test','FontWeight','bold');
%
%   序列色序固定 蓝->红->绿; >=4 条序列循环回蓝并追加 marker 区分,
%   曲线一律实线, 图例加粗。
%   嵌入 Word 版心（14.66cm ≈ 415.6pt）时图内字等效 ≥ 10.5pt（五号）底线、
%   目标 12pt：MATLAB 字号 = 目标等效 ÷ 嵌入缩放 s，s = 摆放宽(pt) ÷ PNG 原生宽(pt)。
%   注释块 ≤ 6 条（中位 3），图例优先放顶部两角空白区。

s.colors         = [0 0 1; 1 0 0; 0 1 0];  % #0000FF 蓝 / #FF0000 红 / #00FF00 绿
s.line_width     = 2;                      % 曲线实线 2pt
s.font_name      = 'Arial';
s.font_size      = 16;                     % 轴标/标题/图例/刻度全部 Arial Bold 16
s.font_weight    = 'bold';
s.axes_line_width = 1.5;                   % 坐标轴框线
s.grid           = 'on';
s.legend_weight  = 'bold';

if nargin > 0
    set(ax, 'FontName', s.font_name, 'FontSize', s.font_size, ...
            'FontWeight', s.font_weight, 'LineWidth', s.axes_line_width);
    grid(ax, s.grid);
end
end
